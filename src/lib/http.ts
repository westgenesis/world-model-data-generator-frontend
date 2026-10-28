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
  searchParams?: Record<string, string | number | boolean>,
): Promise<z.infer<T>> => {
  const data = await http.get(url, { searchParams }).json()
  return schema.parse(data)
}

/**
 * 判断错误是否为指定状态码的 HTTP 错误
 * @param error - 捕获到的错误
 * @param status - HTTP 状态码
 * @returns 是否匹配
 */
export const isHttpStatus = (error: unknown, status: number): boolean =>
  error instanceof HTTPError && error.response.status === status
