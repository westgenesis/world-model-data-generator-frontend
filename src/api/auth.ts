import { queryOptions } from '@tanstack/react-query'
import ky from 'ky'
import { z } from 'zod'
import { env } from '@/lib/env'
import { getJson, sendJson } from '@/lib/http'
import { useAuthStore } from '@/stores/auth-store'
import { envelope } from './common'
import {
  logoutResultSchema,
  tokenPairSchema,
  type LogoutInput,
  type LogoutResult,
  type TokenPair,
} from './token'

/* --------------------------------- 数据模型 --------------------------------- */

/** 后端时间：带时区偏移的 ISO 字符串 */
const dateTime = z.iso.datetime({ offset: true })

/** 当前登录用户 schema（对应后端 UserItem） */
export const currentUserSchema = z.object({
  user_id: z.number(),
  username: z.string(),
  full_name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  department: z.object({ department_id: z.number(), name: z.string() }).nullable(),
  role: z.object({ role_id: z.number(), code: z.string(), name: z.string() }).nullable(),
  status: z.string(),
  must_change_password: z.boolean(),
  last_login_at: dateTime.nullable(),
  created_at: dateTime,
})

/** 当前登录用户 */
export type CurrentUser = z.infer<typeof currentUserSchema>

/** 登录表单 schema */
export const loginSchema = z.object({
  username: z.string('请输入账号').trim().min(1, '请输入账号').max(64, '账号不超过 64 个字符'),
  password: z.string('请输入密码').min(1, '请输入密码').max(128, '密码不超过 128 个字符'),
})

/** 登录表单 */
export type LoginInput = z.infer<typeof loginSchema>

/* --------------------------------- 接口 --------------------------------- */

/**
 * 账号密码登录
 * @param input - 账号与密码
 * @returns 令牌
 */
export const login = (input: LoginInput): Promise<TokenPair> =>
  sendJson('post', 'v1/auth/login', input, envelope(tokenPairSchema))

/**
 * 退出登录：作废本次刷新令牌。
 * 使用独立的 ky 实例（不走统一 http），避免 access_token 过期时触发刷新逻辑；
 * 后端登出以 body 中的 refresh_token 为准，请求失败时由调用方兜底清理本地态。
 * @param input - 刷新令牌与是否作废全部会话
 * @returns 撤销结果
 */
export const logout = async (input: LogoutInput): Promise<LogoutResult> => {
  const { accessToken } = useAuthStore.getState()
  const res = await ky.post(`${env.VITE_API_BASE_URL}/v1/auth/logout`, {
    json: { refresh_token: input.refresh_token, all_devices: input.all_devices ?? false },
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    retry: 0,
  })
  return envelope(logoutResultSchema).parse(await res.json())
}

/** 当前登录用户查询配置 */
export const currentUserQueryOptions = queryOptions({
  queryKey: ['auth', 'me'],
  queryFn: () => getJson('v1/users/me', envelope(currentUserSchema)),
  staleTime: 5 * 60_000,
})
