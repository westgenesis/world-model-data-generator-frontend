import ky, { HTTPError } from 'ky'
import type { z } from 'zod'
import { env } from './env'

/** 本地存储中的登录令牌键名 */
export const TOKEN_STORAGE_KEY = 'wmdg-token'

/** 统一的 ky 实例：自动附加令牌、超时与重试策略 */
export const http = ky.create({
  prefix: env.VITE_API_BASE_URL,
  timeout: 30_000,
  retry: { limit: 1, methods: ['get'] },
  hooks: {
    beforeRequest: [
      ({ request }) => {
        const token = localStorage.getItem(TOKEN_STORAGE_KEY)
        if (token) request.headers.set('Authorization', `Bearer ${token}`)
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

/**
 * 从错误中提取可展示给用户的提示文案（优先使用后端返回的 message 字段）
 * @param error - 捕获到的错误
 * @param fallback - 无法解析时的默认文案
 * @returns 提示文案
 */
export const getErrorMessage = (error: unknown, fallback = '操作失败，请稍后重试'): string => {
  if (error instanceof HTTPError) {
    const { data } = error
    if (typeof data === 'object' && data && 'message' in data && typeof data.message === 'string') {
      return data.message
    }
    return `${fallback}（${error.response.status}）`
  }
  return error instanceof Error && error.message ? error.message : fallback
}
