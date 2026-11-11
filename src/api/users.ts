import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { Department, ExtraPermission, UserRole, UserStatus } from '@/constants/enums'
import { getJson, sendJson } from '@/lib/http'
import type { PageParams } from './common'
import { nullableDateTime, pageSchema } from './common'

/* --------------------------------- 数据模型 --------------------------------- */

/** 用户 schema */
export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  account: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  department: z.enum(Department.values),
  role: z.enum(UserRole.values),
  status: z.enum(UserStatus.values),
  lastLoginAt: nullableDateTime,
  createdAt: z.iso.datetime(),
})

/** 用户 */
export type User = z.infer<typeof userSchema>

/** 用户精简信息（下拉选择、成员选择等场景） */
export const userBriefSchema = userSchema.pick({
  id: true,
  name: true,
  account: true,
  department: true,
  role: true,
})

/** 用户精简信息 */
export type UserBrief = z.infer<typeof userBriefSchema>

/** 用户统计 schema */
export const userStatsSchema = z.object({
  total: z.number(),
  enabled: z.number(),
  disabled: z.number(),
  newThisMonth: z.number(),
})

/** 批量导入预览行 schema */
export const userImportRowSchema = z.object({
  name: z.string(),
  account: z.string(),
  department: z.enum(Department.values).nullable(),
  role: z.enum(UserRole.values).nullable(),
  /** 校验失败原因，为 null 表示通过 */
  error: z.string().nullable(),
})

/** 批量导入预览行 */
export type UserImportRow = z.infer<typeof userImportRowSchema>

/* --------------------------------- 表单 / 请求 --------------------------------- */

/** 手机号（选填） */
const phoneField = z
  .string()
  .regex(/^1[3-9]\d{9}$/, '请输入正确的手机号')
  .optional()
  .or(z.literal(''))

/** 邮箱（选填） */
const emailField = z.email('请输入正确的邮箱').optional().or(z.literal(''))

/** 新增用户请求 schema，同时用于表单校验 */
export const userCreateSchema = z.object({
  name: z.string('请输入姓名').trim().min(1, '请输入姓名').max(32, '姓名不超过 32 个字符'),
  account: z
    .string('请输入登录账号')
    .trim()
    .min(1, '请输入登录账号')
    .regex(/^[a-zA-Z0-9._-]{2,32}$/, '账号为 2–32 位字母、数字或 . _ -'),
  phone: phoneField,
  email: emailField,
  department: z.enum(Department.values, '请选择所属部门'),
  /** 首次登录强制修改密码 */
  forceResetPassword: z.boolean(),
  /** 发送账号信息到邮箱 */
  sendAccountEmail: z.boolean(),
})

/** 新增用户请求 */
export type UserCreateInput = z.infer<typeof userCreateSchema>

/** 编辑用户请求 schema（账号不可修改） */
export const userUpdateSchema = userCreateSchema
  .pick({ name: true, phone: true, email: true, department: true })
  .extend({ status: z.enum(UserStatus.values) })

/** 编辑用户请求 */
export type UserUpdateInput = z.infer<typeof userUpdateSchema>

/** 用户授权请求 schema */
export const userGrantSchema = z.object({
  permission: z.enum(ExtraPermission.values, '请选择附加权限'),
  /** 有效期起止（ISO 日期） */
  startAt: z.iso.datetime(),
  endAt: z.iso.datetime(),
  reason: z.string('请填写授权原因').trim().min(1, '请填写授权原因').max(200, '不超过 200 个字符'),
})

/** 用户授权请求 */
export type UserGrantInput = z.infer<typeof userGrantSchema>

/** 用户列表查询参数 */
export interface UserListParams extends PageParams {
  status?: UserStatus
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
    queryFn: () => getJson('users', pageSchema(userSchema), { ...params }),
    placeholderData: keepPreviousData,
  })

/** 用户统计查询配置 */
export const userStatsQueryOptions = queryOptions({
  queryKey: [...USERS_QUERY_KEY, 'stats'],
  queryFn: () => getJson('users/stats', userStatsSchema),
})

/** 启用状态的用户精简列表（负责人、成员选择等） */
export const userOptionsQueryOptions = queryOptions({
  queryKey: [...USERS_QUERY_KEY, 'options'],
  queryFn: () => getJson('users/options', z.array(userBriefSchema)),
  staleTime: 5 * 60_000,
})

/* --------------------------------- 写操作 --------------------------------- */

/**
 * 新增用户
 * @param input - 用户信息
 */
export const createUser = (input: UserCreateInput) => sendJson('post', 'users', input)

/**
 * 编辑用户
 * @param id - 用户 ID
 * @param input - 用户信息
 */
export const updateUser = (id: string, input: UserUpdateInput) =>
  sendJson('put', `users/${id}`, input)

/**
 * 启用 / 停用用户
 * @param id - 用户 ID
 * @param status - 目标状态
 */
export const updateUserStatus = (id: string, status: UserStatus) =>
  sendJson('patch', `users/${id}/status`, { status })

/**
 * 授予用户临时附加权限
 * @param id - 用户 ID
 * @param input - 授权信息
 */
export const grantUserPermission = (id: string, input: UserGrantInput) =>
  sendJson('post', `users/${id}/grants`, input)

/**
 * 上传导入文件并获取校验预览
 * @param file - .xlsx / .csv 文件
 * @returns 预览行
 */
export const previewUserImport = (file: File) => {
  const body = new FormData()
  body.append('file', file)
  return sendJson('post', 'users/import/preview', body, z.array(userImportRowSchema))
}

/**
 * 确认导入校验通过的用户
 * @param rows - 待导入的行（仅包含校验通过的行）
 * @returns 实际导入条数
 */
export const confirmUserImport = (rows: UserImportRow[]) =>
  sendJson('post', 'users/import', { rows }, z.object({ imported: z.number() }))

/** 导入模板下载地址 */
export const USER_IMPORT_TEMPLATE_URL = 'users/import/template'
