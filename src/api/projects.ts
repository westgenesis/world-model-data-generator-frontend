import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { ProjectStatus, ProjectVisibility } from '@/constants/enums'
import { getJson, sendJson } from '@/lib/http'
import type { PageParams } from './common'
import { envelope, pagedSchema } from './common'

/* --------------------------------- 数据模型 --------------------------------- */

/** 后端时间：项目接口返回无时区偏移（本地时间）的 ISO 字符串 */
const dateTime = z.iso.datetime({ local: true })

/** 项目 schema（对应后端 ProjectRead） */
export const projectSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  description: z.string().nullable(),
  status: z.enum(ProjectStatus.values),
  /** 负责人用户 ID */
  owner_id: z.number().int(),
  visibility: z.enum(ProjectVisibility.values),
  /** 存储参考值（TB），null 表示未设置 */
  storage_ref_tb: z.number().nullable(),
  /** 算力参考值（卡时/月），null 表示未设置 */
  gpu_ref_hours: z.number().nullable(),
  is_default: z.boolean(),
  created_at: dateTime,
  updated_at: dateTime,
})

/** 项目 */
export type Project = z.infer<typeof projectSchema>

/* --------------------------------- 表单 / 请求 --------------------------------- */

/** 新建项目请求 schema（同时用于表单校验；description / 参考值留空传 null） */
export const projectFormSchema = z.object({
  name: z
    .string('请输入项目名称')
    .trim()
    .min(1, '请输入项目名称')
    .max(128, '项目名称不超过 128 个字符'),
  owner_id: z.number('请选择负责人').int().positive(),
  description: z.string().max(512, '项目描述不超过 512 个字符'),
  visibility: z.enum(ProjectVisibility.values, '请选择可见范围'),
  /** 存储参考值（TB），留空表示不设置 */
  storage_ref_tb: z.number('请输入存储参考值').nonnegative('参考值不能为负数').nullable(),
  /** 算力参考值（卡时/月），留空表示不设置 */
  gpu_ref_hours: z.number('请输入算力参考值').nonnegative('参考值不能为负数').nullable(),
  is_default: z.boolean(),
})

/** 新建 / 编辑项目表单值 */
export type ProjectFormValues = z.infer<typeof projectFormSchema>

/** 新建项目请求体（对应后端 ProjectCreate） */
export interface ProjectCreateInput {
  name: string
  owner_id: number
  description: string | null
  visibility: ProjectVisibility
  storage_ref_tb: number | null
  gpu_ref_hours: number | null
  is_default: boolean
}

/** 编辑项目请求体（对应后端 ProjectUpdate，PATCH 只传要改的字段） */
export type ProjectUpdateInput = Partial<ProjectCreateInput> & {
  /** 状态（归档等操作只传该字段） */
  status?: ProjectStatus
}

/**
 * 表单值 → 请求体：描述留空转 null
 * @param values - 表单值
 * @returns 请求体
 */
export const toProjectCreateInput = (values: ProjectFormValues): ProjectCreateInput => ({
  name: values.name.trim(),
  owner_id: values.owner_id,
  description: values.description.trim() || null,
  visibility: values.visibility,
  storage_ref_tb: values.storage_ref_tb,
  gpu_ref_hours: values.gpu_ref_hours,
  is_default: values.is_default,
})

/** 项目列表查询参数 */
export interface ProjectListParams extends PageParams {
  status?: ProjectStatus
}

/* --------------------------------- 查询 --------------------------------- */

/** 项目模块 queryKey，写操作成功后统一失效（含顶栏项目切换器） */
export const PROJECTS_QUERY_KEY = ['projects'] as const

/**
 * 项目分页列表查询配置
 * @param params - 分页与状态筛选
 */
export const projectListQueryOptions = (params: ProjectListParams) =>
  queryOptions({
    queryKey: [...PROJECTS_QUERY_KEY, 'list', params],
    queryFn: () =>
      getJson('v1/projects', envelope(pagedSchema(projectSchema)), {
        status: params.status,
        page: params.page,
        size: params.pageSize,
      }),
    placeholderData: keepPreviousData,
  })

/**
 * 项目详情查询配置
 * @param id - 项目 ID
 */
export const projectDetailQueryOptions = (id: number) =>
  queryOptions({
    queryKey: [...PROJECTS_QUERY_KEY, 'detail', id],
    queryFn: () => getJson(`v1/projects/${id}`, envelope(projectSchema)),
  })

/** 项目精简信息（顶栏项目切换器使用） */
export const projectBriefSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  description: z.string().nullable(),
  owner_id: z.number().int(),
})

/** 项目精简信息 */
export type ProjectBrief = z.infer<typeof projectBriefSchema>

/** 可切换的项目列表（顶栏项目切换器，展示全部状态的项目） */
export const projectsQueryOptions = queryOptions({
  queryKey: [...PROJECTS_QUERY_KEY, 'switcher'],
  queryFn: () =>
    getJson('v1/projects', envelope(pagedSchema(projectBriefSchema)), {
      page: 1,
      size: 100,
    }).then((page) => page.items),
  staleTime: 60_000,
})

/* --------------------------------- 写操作 --------------------------------- */

/**
 * 新建项目
 * @param input - 项目信息
 * @returns 新建的项目
 */
export const createProject = (input: ProjectCreateInput): Promise<Project> =>
  sendJson('post', 'v1/projects', input, envelope(projectSchema))

/**
 * 编辑项目（PATCH 只传要修改的字段）
 * @param id - 项目 ID
 * @param input - 要修改的字段
 * @returns 修改后的项目
 */
export const updateProject = (id: number, input: ProjectUpdateInput): Promise<Project> =>
  sendJson('patch', `v1/projects/${id}`, input, envelope(projectSchema))

/**
 * 删除项目
 * @param id - 项目 ID
 */
export const deleteProject = (id: number): Promise<void> => sendJson('delete', `v1/projects/${id}`)
