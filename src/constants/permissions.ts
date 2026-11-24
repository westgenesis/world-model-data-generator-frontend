/**
 * 权限标识：与后端 permission.code 一一对应。
 * 组件与路由守卫统一引用这里，避免各处手写字符串。
 */
export const PERMISSION = {
  /** 用户管理 */
  userRead: 'user:read',
  userCreate: 'user:create',
  userUpdate: 'user:update',
  userPasswordReset: 'user:password:reset',
  userUnlock: 'user:unlock',
  userImport: 'user:import',
  /** 临时授权 */
  userPermissionRead: 'user:permission:read',
  userPermissionGrant: 'user:permission:grant',
  userPermissionExtend: 'user:permission:extend',
  userPermissionRevoke: 'user:permission:revoke',
  /** 角色与权限定义 */
  roleRead: 'role:read',
  rolePermissionUpdate: 'role:permission:update',
  permissionRead: 'permission:read',
  /** 部门管理 */
  departmentRead: 'department:read',
  departmentCreate: 'department:create',
  departmentUpdate: 'department:update',
  departmentDelete: 'department:delete',
  /** 日志与安全审计 */
  logRead: 'log:read',
  auditRead: 'audit:read',
  auditHandle: 'audit:handle',
  /** 系统配置 */
  settingRead: 'setting:read',
  settingUpdate: 'setting:update',
} as const

/** 权限标识 */
export type PermissionCode = (typeof PERMISSION)[keyof typeof PERMISSION]
