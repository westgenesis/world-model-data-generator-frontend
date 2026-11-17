import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { getJson, sendJson } from '@/lib/http'
import { envelope, pagedSchema } from './common'
import { userRoleSchema } from './users'

/* --------------------------------- 数据模型 --------------------------------- */

/** 角色列表项：角色基本信息 + 管理端字段 */
export const roleSchema = userRoleSchema.extend({
  /** 超级管理员对所有权限短路放行，权限矩阵恒为空且不可修改 */
  is_super_admin: z.boolean(),
})

/** 角色 */
export type Role = z.infer<typeof roleSchema>

/** 角色详情：角色基本信息 + 已分配的权限 code */
export const roleDetailSchema = roleSchema.extend({
  /** 角色当前持有的权限 code；后端省略时按空列表处理 */
  permission_codes: z.array(z.string()).default([]),
})

/** 角色详情 */
export type RoleDetail = z.infer<typeof roleDetailSchema>

/* --------------------------------- 查询 --------------------------------- */

/** 角色模块 queryKey */
export const ROLES_QUERY_KEY = ['roles'] as const

/** 角色列表一次拉取的条数（后端上限 100） */
const ROLE_LIST_SIZE = 100

/** 角色列表查询配置：后端分页返回，这里取满额一页并展开为完整列表 */
export const roleListQueryOptions = queryOptions({
  queryKey: [...ROLES_QUERY_KEY, 'list'],
  queryFn: async () => {
    const page = await getJson('v1/roles', envelope(pagedSchema(roleSchema)), {
      page: 1,
      size: ROLE_LIST_SIZE,
    })
    return page.items
  },
  staleTime: 5 * 60_000,
})

/**
 * 角色详情 queryKey，写操作定位缓存时复用，避免 key 漂移
 * @param roleId - 角色 ID
 * @returns 角色详情的 queryKey
 */
export const roleDetailQueryKey = (roleId: number) =>
  [...ROLES_QUERY_KEY, 'detail', roleId] as const

/**
 * 角色详情查询配置
 * @param roleId - 角色 ID
 * @returns 查询配置
 */
export const roleDetailQueryOptions = (roleId: number) =>
  queryOptions({
    queryKey: roleDetailQueryKey(roleId),
    queryFn: () => getJson(`v1/roles/${roleId}`, envelope(roleDetailSchema)),
    staleTime: 60_000,
  })

/* --------------------------------- 写操作 --------------------------------- */

/**
 * 整体覆盖角色权限
 * @param roleId - 角色 ID
 * @param permissionCodes - 角色最终持有的完整权限 code 列表
 */
export const updateRolePermissions = (roleId: number, permissionCodes: string[]): Promise<void> =>
  sendJson('put', `v1/roles/${roleId}/permissions`, {
    permission_codes: [...new Set(permissionCodes)],
  })
