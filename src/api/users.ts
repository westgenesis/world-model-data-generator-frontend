import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { UserStatus } from '@/constants/enums'
import { getJson, sendJson } from '@/lib/http'
import type { PageParams } from './common'
import { envelope, pagedSchema } from './common'

/* --------------------------------- 数据模型 --------------------------------- */

/** 后端时间：带时区偏移的 ISO 字符串 */
const dateTime = z.iso.datetime({ offset: true })

/** 用户所属部门（列表里只带部门名） */
export const userDepartmentSchema = z.object({
  department_id: z.number().int(),
  name: z.string(),
})

/** 用户全局角色；未分配角色时为 null */
export const userRoleSchema = z.object({
  role_id: z.number().int(),
  code: z.string(),
  name: z.string(),
})

/** 超级管理员的角色 code：该账号不允许被操作 */
export const SUPER_ADMIN_ROLE_CODE = 'super_admin'

/** 用户 schema（对应后端 UserItem） */
export const userSchema = z.object({
  user_id: z.number().int(),
  username: z.string(),
  full_name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  department: userDepartmentSchema.nullable(),
  role: userRoleSchema.nullable(),
  status: z.enum(UserStatus.values),
  must_change_password: z.boolean(),
  login_throttled: z.boolean().default(false),
  last_login_at: dateTime.nullable(),
  created_at: dateTime,
})

/** 用户 */
export type User = z.infer<typeof userSchema>

/** 用户精简信息（项目负责人、成员选择等场景） */
export interface UserBrief {
  id: string
  name: string
  account: string
  /** 所属部门名称，未分配时为 null */
  department: string | null
  /** 全局角色名称，未分配时为 null */
  role: string | null
}

/** 用户统计 schema */
export const userStatsSchema = z.object({
  total: z.number().int(),
  active: z.number().int(),
  disabled: z.number().int(),
  pending: z.number().int(),
  new_this_month: z.number().int(),
})

/** 用户统计 */
export type UserStats = z.infer<typeof userStatsSchema>

/** 新建用户的响应：服务端生成初始密码时只在这里返回一次 */
export const userCreatedSchema = userSchema.extend({
  initial_password: z.string().nullable(),
})

/** 新建用户的结果 */
export type UserCreated = z.infer<typeof userCreatedSchema>

/** 重置密码的结果 */
export const passwordResetResultSchema = z.object({
  user_id: z.number().int(),
  username: z.string(),
  initial_password: z.string().nullable(),
  must_change_password: z.boolean(),
  auth_version: z.number().int(),
})

/** 重置密码的结果 */
export type PasswordResetResult = z.infer<typeof passwordResetResultSchema>

/** 解除登录限流的结果 */
export const userUnlockedSchema = z.object({
  user_id: z.number().int(),
  username: z.string(),
  cleared_failures: z.number().int(),
})

/* --------------------------------- 表单 / 请求 --------------------------------- */

/** 手机号（选填），为空表示不填写 */
const phoneField = z
  .string()
  .trim()
  .regex(/^\+?[0-9][0-9 -]{5,19}$/, '请输入正确的手机号')
  .or(z.literal(''))

/** 邮箱（选填），为空表示不填写 */
const emailField = z.email('请输入正确的邮箱').or(z.literal(''))

/** 新增用户表单 schema，同时用于表单校验 */
export const userCreateSchema = z.object({
  username: z
    .string('请输入登录账号')
    .trim()
    .regex(
      /^[A-Za-z0-9][A-Za-z0-9_.-]{2,63}$/,
      '账号为 3–64 位字母、数字或 . _ -，以字母或数字开头',
    ),
  full_name: z.string('请输入姓名').trim().min(1, '请输入姓名').max(64, '姓名不超过 64 个字符'),
  department_id: z.number('请选择所属部门').int().positive(),
  /** 全局角色，留空表示暂不分配 */
  role_id: z.number().int().positive().optional(),
  phone: phoneField,
  email: emailField,
  /** 初始密码，留空由服务端生成 */
  password: z.string().max(64, '初始密码不超过 64 个字符'),
  /** 首次登录强制修改密码 */
  must_change_password: z.boolean(),
  /** 发送账号信息到邮箱 */
  send_account_info_to_email: z.boolean(),
})

/** 新增用户表单值 */
export type UserCreateValues = z.infer<typeof userCreateSchema>

/** 新增用户请求体 */
export interface UserCreateInput {
  username: string
  full_name: string
  phone: string | null
  email: string | null
  department_id: number
  /** 全局角色，null 表示暂不分配 */
  role_id: number | null
  password: string | null
  must_change_password: boolean
  send_account_info_to_email: boolean
}

/** 编辑用户表单 schema，同时用于表单校验（账号创建后不可修改） */
export const userUpdateSchema = z.object({
  full_name: z.string('请输入姓名').trim().min(1, '请输入姓名').max(64, '姓名不超过 64 个字符'),
  /** 传 null 表示清空部门归属 */
  department_id: z.number().int().positive().nullable(),
  /** 全局角色，留空表示清空角色 */
  role_id: z.number().int().positive().optional(),
  phone: phoneField,
  email: emailField,
})

/** 编辑用户表单值 */
export type UserUpdateValues = z.infer<typeof userUpdateSchema>

/** 编辑用户请求体 */
export interface UserUpdateInput {
  full_name: string
  phone: string | null
  email: string | null
  department_id: number | null
  /** 全局角色，null 表示清空角色 */
  role_id: number | null
}

/** 重置密码表单 schema，同时用于表单校验 */
export const passwordResetSchema = z.object({
  /** 新密码，留空由服务端生成 */
  new_password: z.string().max(128, '密码不超过 128 个字符'),
  /** 重置后是否要求对方下次登录先改密码 */
  must_change_password: z.boolean(),
})

/** 重置密码表单值 */
export type PasswordResetValues = z.infer<typeof passwordResetSchema>

/** 重置密码请求体 */
export interface PasswordResetInput {
  new_password: string | null
  must_change_password: boolean
}

/** 用户列表查询参数 */
export interface UserListParams extends PageParams {
  status?: UserStatus
  /** 所属部门 */
  departmentId?: number
  /** 姓名 / 账号 */
  keyword?: string
}

/* --------------------------------- 查询 --------------------------------- */

/** 用户模块 queryKey，写操作成功后统一失效 */
export const USERS_QUERY_KEY = ['users'] as const

/**
 * 用户分页列表查询配置
 * @param params - 分页与筛选参数
 */
export const userListQueryOptions = (params: UserListParams) =>
  queryOptions({
    queryKey: [...USERS_QUERY_KEY, 'list', params],
    queryFn: () =>
      getJson('v1/users', envelope(pagedSchema(userSchema)), {
        keyword: params.keyword,
        department_id: params.departmentId,
        status: params.status,
        page: params.page,
        size: params.pageSize,
      }),
    placeholderData: keepPreviousData,
  })

/** 用户统计查询配置 */
export const userStatsQueryOptions = queryOptions({
  queryKey: [...USERS_QUERY_KEY, 'stats'],
  queryFn: () => getJson('v1/users/statistics', envelope(userStatsSchema)),
})

/** 启用状态的用户精简列表（项目负责人、成员选择等） */
export const userOptionsQueryOptions = queryOptions({
  queryKey: [...USERS_QUERY_KEY, 'options'],
  queryFn: async (): Promise<UserBrief[]> => {
    const page = await getJson('v1/users', envelope(pagedSchema(userSchema)), {
      status: 'active',
      page: 1,
      size: 100,
    })
    return page.items.map((user) => ({
      id: String(user.user_id),
      name: user.full_name,
      account: user.username,
      department: user.department?.name ?? null,
      role: user.role?.name ?? null,
    }))
  },
  staleTime: 5 * 60_000,
})

/* --------------------------------- 写操作 --------------------------------- */

/**
 * 新增用户
 * @param input - 用户信息
 * @returns 新建的用户（含服务端生成的初始密码）
 */
export const createUser = (input: UserCreateInput): Promise<UserCreated> =>
  sendJson('post', 'v1/users', input, envelope(userCreatedSchema))

/**
 * 编辑用户
 * @param id - 用户 ID
 * @param input - 用户信息
 * @returns 修改后的用户
 */
export const updateUser = (id: number, input: UserUpdateInput): Promise<User> =>
  sendJson('put', `v1/users/${id}`, input, envelope(userSchema))

/**
 * 启用 / 停用用户
 * @param id - 用户 ID
 * @param isEnabled - true 启用，false 停用
 * @returns 修改后的用户
 */
export const updateUserStatus = (id: number, isEnabled: boolean): Promise<User> =>
  sendJson('post', `v1/users/${id}/status`, { is_enabled: isEnabled }, envelope(userSchema))

/**
 * 重置用户密码
 * @param id - 用户 ID
 * @param input - 新密码与是否强制修改
 * @returns 重置结果（服务端生成密码时会返回初始密码）
 */
export const resetUserPassword = (
  id: number,
  input: PasswordResetInput,
): Promise<PasswordResetResult> =>
  sendJson('post', `v1/users/${id}/password`, input, envelope(passwordResetResultSchema))

/**
 * 解除用户登录限流
 * @param id - 用户 ID
 * @returns 解除结果
 */
export const unlockUser = (id: number) =>
  sendJson('post', `v1/users/${id}/unlock`, undefined, envelope(userUnlockedSchema))
