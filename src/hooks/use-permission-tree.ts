import { useMemo } from 'react'
import type { Permission } from '@/api/permissions'
import { permissionModuleSchema } from '@/api/permissions'

/* --------------------------------- 类型 --------------------------------- */

/** 表格行：权限项 + 合并单元格信息 */
export interface PermissionTreeRow extends Permission {
  /** 模块列合并行数；被上方合并覆盖的行取 0 */
  moduleRowSpan: number
  /** 子模块列合并行数；被上方合并覆盖的行取 0 */
  subModuleRowSpan: number
}

/** 子模块分组 */
export interface PermissionSubModuleGroup {
  /** 子模块名称 */
  subModule: string
  /** 子模块下的权限项 */
  permissions: Permission[]
}

/** 模块分组 */
export interface PermissionModuleGroup {
  /** 业务模块 */
  module: Permission['module']
  /** 模块下的子模块 */
  subModules: PermissionSubModuleGroup[]
}

/** 权限树计算结果 */
export interface PermissionTree {
  /** 表格 dataSource，已按模块与子模块连续排列 */
  rows: PermissionTreeRow[]
  /** 模块与子模块分组 */
  groups: PermissionModuleGroup[]
  /** 模块数 */
  moduleCount: number
  /** 子模块数 */
  subModuleCount: number
  /** 可选权限项数 */
  permissionCount: number
}

/* --------------------------------- 分组 --------------------------------- */

/** 模块展示顺序，沿用权限 schema 中的业务顺序 */
const MODULE_ORDER = new Map(permissionModuleSchema.options.map((module, index) => [module, index]))

/**
 * 把权限列表按模块 / 子模块重组，并计算合并单元格所需的 rowSpan
 * @param permissions - 原始权限列表
 * @returns 权限树；仅包含启用且未孤立的权限项
 */
export const buildPermissionTree = (permissions: Permission[]): PermissionTree => {
  const visible = permissions.filter((permission) => permission.is_active && !permission.is_orphan)

  // 只重排模块；子模块与权限项保持后端返回顺序
  const sorted = [...visible].sort(
    (a, b) => (MODULE_ORDER.get(a.module) ?? 0) - (MODULE_ORDER.get(b.module) ?? 0),
  )

  const moduleMap = new Map<Permission['module'], Map<string, Permission[]>>()
  for (const permission of sorted) {
    const subModules = moduleMap.get(permission.module) ?? new Map<string, Permission[]>()
    moduleMap.set(permission.module, subModules)

    const list = subModules.get(permission.sub_module) ?? []
    list.push(permission)
    subModules.set(permission.sub_module, list)
  }

  const rows: PermissionTreeRow[] = []
  const groups: PermissionModuleGroup[] = []
  let subModuleCount = 0

  for (const [module, subModules] of moduleMap) {
    const moduleRowCount = [...subModules.values()].reduce((sum, list) => sum + list.length, 0)
    let isFirstRowOfModule = true
    const subModuleGroups: PermissionSubModuleGroup[] = []

    for (const [subModule, list] of subModules) {
      subModuleCount += 1
      subModuleGroups.push({ subModule, permissions: list })

      list.forEach((permission, index) => {
        rows.push({
          ...permission,
          moduleRowSpan: isFirstRowOfModule ? moduleRowCount : 0,
          subModuleRowSpan: index === 0 ? list.length : 0,
        })
        isFirstRowOfModule = false
      })
    }

    groups.push({ module, subModules: subModuleGroups })
  }

  return {
    rows,
    groups,
    moduleCount: groups.length,
    subModuleCount,
    permissionCount: visible.length,
  }
}

/**
 * 权限树 hook：对权限列表分组并计算合并单元格信息
 * @param permissions - 原始权限列表
 * @returns 权限树
 */
export const usePermissionTree = (permissions: Permission[]): PermissionTree =>
  useMemo(() => buildPermissionTree(permissions), [permissions])
