import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { UserGrantStatus } from '@/constants/enums'
import { getJson, sendJson } from '@/lib/http'
import type { PageParams } from './common'
import { envelope, pagedSchema } from './common'

/* --------------------------------- 数据模型 --------------------------------- */

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
  status: z.enum(UserGrantStatus.values),
  operator_id: z.number().int().nullable().optional(),
  revoked_at: z.string().nullable().optional(),
  created_at: z.string(),
})

/** 授权记录 */
export type UserGrant = z.infer<typeof userGrantSchema>

/** 批量操作结果（对应后端 UserPermissionGrantBatch） */
export const userGrantBatchSchema = z.object({
  grant_ids: z.array(z.number().int()),
  affected: z.number().int(),
})

/** 批量操作结果 */
export type UserGrantBatch = z.infer<typeof userGrantBatchSchema>

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

/** 临时授权列表查询参数 */
export interface UserGrantListParams extends PageParams {
  /** 用户标识 */
  userId?: number
  /** 授权状态 */
  status?: UserGrantStatus
}

/* --------------------------------- 查询 --------------------------------- */

/** 临时授权模块 queryKey，写操作成功后统一失效 */
export const USER_GRANTS_QUERY_KEY = ['user-grants'] as const

/**
 * 临时授权分页列表查询配置
 * @param params - 分页与筛选参数
 */
export const userGrantListQueryOptions = (params: UserGrantListParams) =>
  queryOptions({
    queryKey: [...USER_GRANTS_QUERY_KEY, 'list', params],
    queryFn: () =>
      getJson('v1/user-permission-grants', envelope(pagedSchema(userGrantSchema)), {
        user_id: params.userId,
        status: params.status,
        page: params.page,
        size: params.pageSize,
      }),
    placeholderData: keepPreviousData,
  })

/* --------------------------------- 写操作 --------------------------------- */

/**
 * 给用户追加临时权限
 * @param input - 用户、权限与有效期
 * @returns 新增的授权记录
 */
export const createUserGrant = (input: UserGrantCreateInput): Promise<UserGrant[]> =>
  sendJson('post', 'v1/user-permission-grants', input, envelope(z.array(userGrantSchema)))

/**
 * 批量延期授权
 * @param grantIds - 授权记录 ID 列表（最多 100 条）
 * @param effectiveTo - 新的失效时间，必须晚于当前时间
 * @returns 批量操作结果
 */
export const extendUserGrants = (
  grantIds: number[],
  effectiveTo: string,
): Promise<UserGrantBatch> =>
  sendJson(
    'post',
    'v1/user-permission-grants/extend',
    { grant_ids: grantIds, effective_to: effectiveTo },
    envelope(userGrantBatchSchema),
  )

/**
 * 批量收回授权
 * @param grantIds - 授权记录 ID 列表（最多 100 条）
 * @returns 批量操作结果
 */
export const revokeUserGrants = (grantIds: number[]): Promise<UserGrantBatch> =>
  sendJson(
    'post',
    'v1/user-permission-grants/revoke',
    { grant_ids: grantIds },
    envelope(userGrantBatchSchema),
  )
