import { useQuery } from '@tanstack/react-query'
import { roleListQueryOptions } from '@/api/roles'

/**
 * 角色列表查询（角色选择器等场景共用）
 * @param enabled - 是否发起请求，抽屉内可传 open 延迟加载
 * @returns 角色列表查询结果
 */
export const useRoleList = (enabled = true) =>
  useQuery({
    ...roleListQueryOptions,
    enabled,
  })
