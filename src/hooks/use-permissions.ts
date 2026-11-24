import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { MyPermissions } from '@/api/auth'
import { myPermissionsQueryOptions } from '@/api/auth'
import type { PermissionCode } from '@/constants/permissions'

/** 权限判定器 */
export interface PermissionChecker {
  /** 是否为系统管理员（拥有全部权限） */
  isSuperAdmin: boolean
  /** 权限数据是否仍在加载 */
  isPending: boolean
  /** 是否拥有指定权限 */
  has: (code: PermissionCode) => boolean
  /** 是否拥有任意一项权限 */
  hasAny: (codes: readonly PermissionCode[]) => boolean
}

/** 数据未就绪时的判定器：一律不放行 */
const DENY_ALL: PermissionChecker = {
  isSuperAdmin: false,
  isPending: true,
  has: () => false,
  hasAny: () => false,
}

/**
 * 由接口数据构造权限判定器：系统管理员短路放行，其余按权限 code 精确匹配
 * @param data - 当前用户权限；未加载完成时为 undefined
 * @returns 权限判定器
 */
export const createPermissionChecker = (data?: MyPermissions): PermissionChecker => {
  if (!data) return DENY_ALL

  if (data.is_super_admin) {
    return { isSuperAdmin: true, isPending: false, has: () => true, hasAny: () => true }
  }

  const codes = new Set(data.permissions.map((permission) => permission.code))
  return {
    isSuperAdmin: false,
    isPending: false,
    has: (code) => codes.has(code),
    hasAny: (list) => list.some((code) => codes.has(code)),
  }
}

/**
 * 判断当前用户是否拥有指定权限，供路由守卫等非组件场景使用
 * @param data - 当前用户权限
 * @param code - 权限标识
 * @returns 是否拥有
 */
export const hasPermission = (data: MyPermissions | undefined, code: PermissionCode): boolean =>
  createPermissionChecker(data).has(code)

/**
 * 当前用户权限 hook：读取权限查询结果并包装为判定器
 * @returns 权限判定器
 */
export const usePermissions = (): PermissionChecker => {
  const { data, isPending } = useQuery(myPermissionsQueryOptions)
  return useMemo(() => ({ ...createPermissionChecker(data), isPending }), [data, isPending])
}
