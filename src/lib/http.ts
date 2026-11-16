import ky, { HTTPError } from 'ky'
import { z } from 'zod'
import { envelope } from '@/api/common'
import { tokenPairSchema } from '@/api/token'
import { isAccessTokenExpiring, useAuthStore } from '@/stores/auth-store'
import { env } from './env'

/** 认证类接口路径片段：这些接口返回 401 时不触发刷新令牌 */
const AUTH_PATH = '/v1/auth/'

/** 进行中的刷新请求，并发 401 时共用同一次刷新 */
let refreshing: Promise<string | null> | null = null

/**
 * 用刷新令牌换取新的访问令牌；失败时清空登录态
 * @returns 新的访问令牌，刷新失败时为 null
 */
const refreshAccessToken = (): Promise<string | null> => {
  refreshing ??= (async () => {
    const { refreshToken, setTokens, clear } = useAuthStore.getState()
    if (!refreshToken) return null
    try {
      const res = await ky
        .post(`${env.VITE_API_BASE_URL}${AUTH_PATH}refresh`, {
          json: { refresh_token: refreshToken },
          retry: 0,
        })
        .json()
      const tokens = envelope(tokenPairSchema).parse(res)
      setTokens({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
      })
      return tokens.access_token
    } catch {
      clear()
      return null
    }
  })().finally(() => {
    refreshing = null
  })
  return refreshing
}

/**
 * 登录失效后跳转登录页，并记录当前地址以便登录后返回
 */
const redirectToLogin = async (): Promise<void> => {
  // 动态引入以避免 router → 路由 → api → http 的循环依赖
  const { router } = await import('@/app/router')
  if (router.state.location.pathname === '/login') return
  await router.navigate({ to: '/login', search: { redirect: router.state.location.href } })
}

/** 统一的 ky 实例：自动附加令牌、超时与重试策略，401 时自动刷新令牌 */
export const http = ky.create({
  prefix: env.VITE_API_BASE_URL,
  timeout: 30_000,
  retry: { limit: 1, methods: ['get'] },
  hooks: {
    beforeRequest: [
      async ({ request }) => {
        // 令牌临近过期时提前刷新，避免请求发出后被 401 打断
        let token = useAuthStore.getState().accessToken
        if (isAccessTokenExpiring()) {
          token = (await refreshAccessToken()) ?? useAuthStore.getState().accessToken
        }
        if (token) request.headers.set('Authorization', `Bearer ${token}`)
      },
    ],
    afterResponse: [
      async ({ request, response, retryCount }) => {
        if (response.status !== 401 || new URL(request.url).pathname.includes(AUTH_PATH)) return
        const token = retryCount === 0 ? await refreshAccessToken() : null
        if (!token) {
          useAuthStore.getState().clear()
          void redirectToLogin()
          return
        }
        const headers = new Headers(request.headers)
        headers.set('Authorization', `Bearer ${token}`)
        return ky.retry({ request: new Request(request, { headers }), delay: 0 })
      },
    ],
  },
})

/**
 * 发起 GET 请求并用 zod schema 校验响应数据
 * @param url - 相对于 API 基础路径的地址（不以 / 开头）
 * @param schema - 响应数据的 zod schema
 * @param searchParams - 查询参数
 * @returns 校验通过的响应数据
 */
export const getJson = async <T extends z.ZodType>(
  url: string,
  schema: T,
  searchParams?: SearchParams,
): Promise<z.infer<T>> => {
  const data = await http.get(url, { searchParams: compactParams(searchParams) }).json()
  return schema.parse(data)
}

/** 查询参数：值为 undefined / null / 空字符串时自动忽略 */
export type SearchParams = Record<string, string | number | boolean | null | undefined>

/**
 * 去掉查询参数中的空值，避免向后端传递 `?status=undefined`
 * @param params - 原始查询参数
 * @returns 仅包含有效值的查询参数
 */
const compactParams = (params?: SearchParams): Record<string, string | number | boolean> =>
  Object.fromEntries(
    Object.entries(params ?? {}).filter(
      (entry): entry is [string, string | number | boolean] =>
        entry[1] !== undefined && entry[1] !== null && entry[1] !== '',
    ),
  )

/** 写操作的 HTTP 方法 */
type MutationMethod = 'post' | 'put' | 'patch' | 'delete'

/**
 * 发起写请求（POST / PUT / PATCH / DELETE）
 * @param method - HTTP 方法
 * @param url - 相对于 API 基础路径的地址（不以 / 开头）
 * @param body - 请求体：普通对象按 JSON 发送，FormData 按表单发送
 * @param schema - 响应数据的 zod schema；不传时忽略响应体
 * @returns 校验通过的响应数据；未传 schema 时为 undefined
 */
export const sendJson = async <T extends z.ZodType = z.ZodVoid>(
  method: MutationMethod,
  url: string,
  body?: unknown,
  schema?: T,
): Promise<z.infer<T>> => {
  const options = body instanceof FormData ? { body } : body === undefined ? {} : { json: body }
  const response = http(url, { method, ...options })
  if (!schema) {
    await response
    return undefined as z.infer<T>
  }
  return schema.parse(await response.json())
}

/**
 * 判断错误是否为指定状态码的 HTTP 错误
 * @param error - 捕获到的错误
 * @param status - HTTP 状态码
 * @returns 是否匹配
 */
export const isHttpStatus = (error: unknown, status: number): boolean =>
  error instanceof HTTPError && error.response.status === status

/** 后端错误响应体：`{ error: { message } }` 或 `{ message }` */
const errorBodySchema = z.union([
  z.object({ error: z.object({ message: z.string() }) }).transform((b) => b.error.message),
  z.object({ message: z.string() }).transform((b) => b.message),
])

/**
 * 从错误中提取可展示给用户的提示文案（优先使用后端返回的 message 字段）
 * @param error - 捕获到的错误
 * @param fallback - 无法解析时的默认文案
 * @returns 提示文案
 */
export const getErrorMessage = (error: unknown, fallback = '操作失败，请稍后重试'): string => {
  if (error instanceof HTTPError) {
    const parsed = errorBodySchema.safeParse(error.data)
    if (parsed.success) return parsed.data
    return `${fallback}（${error.response.status}）`
  }
  return error instanceof Error && error.message ? error.message : fallback
}
