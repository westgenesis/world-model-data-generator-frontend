import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { getJson } from '@/lib/http'
import { envelope } from './common'

/* --------------------------------- 数据模型 --------------------------------- */

/** 权限所属业务域 */
export const permissionModuleSchema = z.enum(['用户服务管理', '场景生成', '数据生成', '数据集管理'])

/** 权限 schema（对应后端 PermissionItem） */
export const permissionSchema = z.object({
  permission_id: z.number().int(),
  code: z.string(),
  name: z.string(),
  module: permissionModuleSchema,
  sub_module: z.string(),
  description: z.string(),
  is_active: z.boolean(),
  /** 代码里已不存在，仅保留历史授权 */
  is_orphan: z.boolean(),
})

/** 权限 */
export type Permission = z.infer<typeof permissionSchema>

/* --------------------------------- 查询 --------------------------------- */

/** 权限模块 queryKey */
export const PERMISSIONS_QUERY_KEY = ['permissions'] as const

/** 启用中的权限列表（用户授权等场景） */
export const permissionListQueryOptions = queryOptions({
  queryKey: [...PERMISSIONS_QUERY_KEY, 'list'],
  queryFn: () =>
    getJson('v1/permissions', envelope(z.array(permissionSchema)), { is_active: true }),
  staleTime: 5 * 60_000,
})
