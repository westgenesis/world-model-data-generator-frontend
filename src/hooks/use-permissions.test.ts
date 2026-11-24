import { describe, expect, it } from 'vitest'
import type { MyPermissions } from '@/api/auth'
import { PERMISSION } from '@/constants/permissions'
import { createPermissionChecker, hasPermission } from './use-permissions'

/**
 * 构造当前用户权限数据
 * @param codes - 生效中的权限 code
 * @param isSuperAdmin - 是否系统管理员
 * @returns 权限数据
 */
const buildPermissions = (codes: string[], isSuperAdmin = false): MyPermissions => ({
  is_super_admin: isSuperAdmin,
  role: { role_id: 1, code: 'viewer', name: '只读角色' },
  permissions: codes.map((code) => ({
    code,
    name: code,
    module: '用户服务管理',
    sub_module: '用户管理',
    sources: ['role'],
    effective_to: null,
  })),
})

describe('createPermissionChecker', () => {
  it('系统管理员放行全部权限', () => {
    const checker = createPermissionChecker(buildPermissions([], true))
    expect(checker.isSuperAdmin).toBe(true)
    expect(checker.has(PERMISSION.userCreate)).toBe(true)
    expect(checker.hasAny([PERMISSION.departmentDelete])).toBe(true)
  })

  it('按权限 code 精确匹配', () => {
    const checker = createPermissionChecker(buildPermissions([PERMISSION.userRead]))
    expect(checker.has(PERMISSION.userRead)).toBe(true)
    expect(checker.has(PERMISSION.userUpdate)).toBe(false)
  })

  it('拥有任意一项权限即通过', () => {
    const checker = createPermissionChecker(buildPermissions([PERMISSION.auditRead]))
    expect(checker.hasAny([PERMISSION.logRead, PERMISSION.auditRead])).toBe(true)
    expect(checker.hasAny([PERMISSION.logRead, PERMISSION.settingRead])).toBe(false)
  })

  it('数据未就绪时一律不放行', () => {
    const checker = createPermissionChecker()
    expect(checker.isPending).toBe(true)
    expect(checker.has(PERMISSION.userRead)).toBe(false)
    expect(checker.hasAny([PERMISSION.userRead])).toBe(false)
    expect(hasPermission(undefined, PERMISSION.userRead)).toBe(false)
  })
})
