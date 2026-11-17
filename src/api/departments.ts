import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { getJson, sendJson } from '@/lib/http'
import { envelope } from './common'

/* --------------------------------- 数据模型 --------------------------------- */

/** 部门 schema（对应后端 DepartmentItem） */
export const departmentSchema = z.object({
  department_id: z.number().int(),
  name: z.string(),
  is_active: z.boolean(),
})

/** 部门 */
export type Department = z.infer<typeof departmentSchema>

/* --------------------------------- 表单 / 请求 --------------------------------- */

/** 新增部门请求 schema，同时用于表单校验 */
export const departmentCreateSchema = z.object({
  name: z
    .string('请输入部门名称')
    .trim()
    .min(1, '请输入部门名称')
    .max(64, '部门名称不超过 64 个字符'),
})

/** 新增部门请求 */
export type DepartmentCreateInput = z.infer<typeof departmentCreateSchema>

/** 修改部门请求 schema（后端只要求传要改的字段） */
export const departmentUpdateSchema = departmentCreateSchema.extend({
  is_active: z.boolean(),
})

/** 修改部门请求 */
export type DepartmentUpdateInput = Partial<z.infer<typeof departmentUpdateSchema>>

/* --------------------------------- 查询 --------------------------------- */

/** 部门模块 queryKey，写操作成功后统一失效 */
export const DEPARTMENTS_QUERY_KEY = ['departments'] as const

/** 部门列表查询配置（后端返回完整列表，不分页） */
export const departmentListQueryOptions = queryOptions({
  queryKey: [...DEPARTMENTS_QUERY_KEY, 'list'],
  queryFn: () => getJson('v1/departments', envelope(z.array(departmentSchema))),
  staleTime: 60_000,
})

/* --------------------------------- 写操作 --------------------------------- */

/**
 * 新建部门
 * @param input - 部门名称
 * @returns 新建的部门
 */
export const createDepartment = (input: DepartmentCreateInput): Promise<Department> =>
  sendJson('post', 'v1/departments', input, envelope(departmentSchema))

/**
 * 修改部门名称或启停状态
 * @param id - 部门 ID
 * @param input - 要修改的字段
 * @returns 修改后的部门
 */
export const updateDepartment = (id: number, input: DepartmentUpdateInput): Promise<Department> =>
  sendJson('put', `v1/departments/${id}`, input, envelope(departmentSchema))

/**
 * 删除部门
 * @param id - 部门 ID
 */
export const deleteDepartment = (id: number): Promise<void> =>
  sendJson('delete', `v1/departments/${id}`)
