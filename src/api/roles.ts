import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { getJson } from '@/lib/http'
import { envelope } from './common'
import { userRoleSchema } from './users'

/* --------------------------------- 数据模型 --------------------------------- */

/** 角色（与用户接口返回的 role 字段结构一致） */
export type Role = z.infer<typeof userRoleSchema>

/* --------------------------------- 查询 --------------------------------- */

/** 角色模块 queryKey */
export const ROLES_QUERY_KEY = ['roles'] as const

/** 角色列表查询配置（后端返回完整列表，不分页） */
export const roleListQueryOptions = queryOptions({
  queryKey: [...ROLES_QUERY_KEY, 'list'],
  queryFn: () => getJson('v1/roles', envelope(z.array(userRoleSchema))),
  staleTime: 5 * 60_000,
})
