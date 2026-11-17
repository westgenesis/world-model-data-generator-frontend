import { z } from 'zod'
import { sendJson } from '@/lib/http'
import { envelope } from './common'

/* --------------------------------- 数据模型 --------------------------------- */

/** 授权记录状态：待生效 / 生效中 / 已过期 / 已撤销 */
export const userGrantStatuses = ['pending', 'active', 'expired', 'revoked'] as const

/** 授权记录 schema（对应后端 UserPermissionGrantItem） */
export const userGrantSchema = z.object({
  grant_id: z.number().int(),
  user_id: z.number().int(),
  username: z.string(),
  full_name: z.string().nullable(),
  permission_id: z.number().int(),
  permission_code: z.string(),
  permission_name: z.string(),
  effective_from: z.string(),
  effective_to: z.string(),
  reason: z.string(),
  status: z.enum(userGrantStatuses),
  operator_id: z.number().int().nullable().optional(),
  revoked_at: z.string().nullable().optional(),
  created_at: z.string(),
})

/** 授权记录 */
export type UserGrant = z.infer<typeof userGrantSchema>

/* --------------------------------- 请求 --------------------------------- */

/** 给用户授权的请求体 */
export interface UserGrantCreateInput {
  user_id: number
  /** 权限标识列表，重复项只保留一条 */
  permission_codes: string[]
  /** 生效时间，不传为当前时间 */
  effective_from?: string
  /** 失效时间，必须晚于生效时间 */
  effective_to: string
  /** 授权原因 */
  reason?: string | null
}

/* --------------------------------- 写操作 --------------------------------- */

/**
 * 给用户追加临时权限
 * @param input - 用户、权限与有效期
 * @returns 新增的授权记录
 */
export const createUserGrant = (input: UserGrantCreateInput): Promise<UserGrant[]> =>
  sendJson('post', 'v1/user-permission-grants', input, envelope(z.array(userGrantSchema)))
