import { z } from 'zod'

/** 登录 / 刷新接口返回的令牌对（对应后端 TokenPair） */
export const tokenPairSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  token_type: z.string().default('bearer'),
  /** 访问令牌有效秒数 */
  expires_in: z.number(),
  /** 首次登录或密码被重置后为 true */
  must_change_password: z.boolean(),
})

/** 令牌对 */
export type TokenPair = z.infer<typeof tokenPairSchema>

/** 退出登录请求（对应后端 LogoutRequest） */
export interface LogoutInput {
  /** 刷新令牌 */
  refresh_token: string
  /** true 作废该账号的全部会话，false 只作废本次刷新令牌 */
  all_devices?: boolean
}

/** 退出登录结果（对应后端 LogoutResult） */
export const logoutResultSchema = z.object({
  /** current 表示只作废本次刷新令牌，all 表示全部会话 */
  scope: z.string(),
  /** 撤销记录保留秒数；scope=all 时为 0 */
  expires_in: z.number(),
})

/** 退出登录结果 */
export type LogoutResult = z.infer<typeof logoutResultSchema>
