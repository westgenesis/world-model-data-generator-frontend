import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import {
  AlertStatus,
  DataScope,
  Department,
  ExpiryReminder,
  ProjectActivityType,
  ProjectMemberRole,
  ProjectStatus,
  ProjectVisibility,
  ResourceType,
} from '@/constants/enums'
import type { ProjectStatusFilter } from '@/constants/enums'
import { getJson, sendJson } from '@/lib/http'
import type { PageParams } from './common'
import { nullableDateTime, pageSchema } from './common'

/* --------------------------------- 数据模型 --------------------------------- */

/** 项目精简 schema（顶栏项目切换器使用） */
export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
})

/** 项目精简信息 */
export type Project = z.infer<typeof projectSchema>

/** 项目完整信息 schema */
export const projectDetailSchema = projectSchema.extend({
  /** 项目标识，如 PRJ-0001 */
  code: z.string(),
  ownerId: z.string().nullable(),
  /** 负责人姓名；系统内置项目为「系统」 */
  ownerName: z.string(),
  departments: z.array(z.enum(Department.values)),
  description: z.string(),
  visibility: z.enum(ProjectVisibility.values),
  /** 存储参考值（TB），仅用于用量提醒 */
  storageQuotaTb: z.number(),
  /** 算力参考值（卡时），仅用于用量提醒 */
  computeQuotaHours: z.number(),
  isDefault: z.boolean(),
  status: z.enum(ProjectStatus.values),
  memberCount: z.number(),
  dataSizeTb: z.number(),
  /** 默认项目不统计任务数与场景数，返回 null */
  taskCount: z.number().nullable(),
  sceneCount: z.number().nullable(),
  createdAt: z.iso.datetime(),
})

/** 项目完整信息 */
export type ProjectDetail = z.infer<typeof projectDetailSchema>

/** 项目统计 schema */
export const projectStatsSchema = z.object({
  total: z.number(),
  active: z.number(),
  archived: z.number(),
  defaultCount: z.number(),
  memberCount: z.number(),
  storageUsedTb: z.number(),
  storageQuotaTb: z.number(),
})

/** 项目概览 schema */
export const projectOverviewSchema = z.object({
  datasetCount: z.number(),
  clipCount: z.number(),
  /** 近 6 个月数据量增长，按月份倒序 */
  growth: z.array(
    z.object({
      month: z.string(),
      sizeTb: z.number(),
      count: z.number(),
      /** 环比（小数，如 0.18 表示 +18%）；首月为 null */
      ratio: z.number().nullable(),
    }),
  ),
  activities: z.array(
    z.object({
      id: z.string(),
      type: z.enum(ProjectActivityType.values),
      title: z.string(),
      description: z.string(),
      time: z.iso.datetime(),
    }),
  ),
})

/** 项目概览 */
export type ProjectOverview = z.infer<typeof projectOverviewSchema>

/** 项目成员 schema */
export const projectMemberSchema = z.object({
  userId: z.string(),
  name: z.string(),
  account: z.string(),
  role: z.enum(ProjectMemberRole.values),
  dataScope: z.enum(DataScope.values),
  /** 有效期截止，null 表示长期有效 */
  expireAt: nullableDateTime,
  reminder: z.enum(ExpiryReminder.values),
  remark: z.string(),
  joinedAt: z.iso.datetime(),
  lastActiveAt: nullableDateTime,
})

/** 项目成员 */
export type ProjectMember = z.infer<typeof projectMemberSchema>

/** 项目资源消耗 schema */
export const projectResourcesSchema = z.object({
  storage: z.object({
    usedTb: z.number(),
    quotaTb: z.number(),
    breakdown: z.array(z.object({ label: z.string(), valueTb: z.number() })),
  }),
  compute: z.object({
    usedHours: z.number(),
    quotaHours: z.number(),
    monthHours: z.number(),
    taskCount: z.number(),
    avgHoursPerTask: z.number(),
  }),
  alerts: z.array(
    z.object({
      id: z.string(),
      time: z.iso.datetime(),
      type: z.enum(ResourceType.values),
      content: z.string(),
      targets: z.string(),
      status: z.enum(AlertStatus.values),
    }),
  ),
})

/** 项目资源消耗 */
export type ProjectResources = z.infer<typeof projectResourcesSchema>

/** 归档影响评估 schema */
export const projectArchiveImpactSchema = z.object({
  runningTaskCount: z.number(),
  memberCount: z.number(),
  dataSizeTb: z.number(),
  datasetCount: z.number(),
})

/* --------------------------------- 表单 / 请求 --------------------------------- */

/** 新建 / 编辑项目请求 schema，同时用于表单校验 */
export const projectFormSchema = z.object({
  name: z.string('请输入项目名称').trim().min(1, '请输入项目名称').max(50, '不超过 50 个字符'),
  code: z
    .string('请输入项目标识')
    .trim()
    .min(1, '请输入项目标识')
    .regex(/^[A-Z][A-Z0-9-]{1,31}$/, '以大写字母开头，仅含大写字母、数字与 -'),
  ownerId: z.string('请选择负责人').min(1, '请选择负责人'),
  departments: z.array(z.enum(Department.values)),
  description: z.string().max(200, '不超过 200 个字符'),
  visibility: z.enum(ProjectVisibility.values),
  storageQuotaTb: z.number('请输入存储参考值').positive('需大于 0'),
  computeQuotaHours: z.number('请输入算力参考值').positive('需大于 0'),
  isDefault: z.boolean(),
})

/** 新建 / 编辑项目请求 */
export type ProjectFormInput = z.infer<typeof projectFormSchema>

/** 成员设置（角色、数据范围、有效期）schema */
export const projectMemberSettingSchema = z.object({
  role: z.enum(ProjectMemberRole.values, '请选择项目内角色'),
  dataScope: z.enum(DataScope.values, '请选择数据范围'),
  expireAt: nullableDateTime,
  reminder: z.enum(ExpiryReminder.values),
  remark: z.string().max(200, '不超过 200 个字符'),
})

/** 成员设置 */
export type ProjectMemberSetting = z.infer<typeof projectMemberSettingSchema>

/** 添加成员请求 schema */
export const projectMemberAddSchema = projectMemberSettingSchema.extend({
  userIds: z.array(z.string()).min(1, '请至少选择一位用户'),
})

/** 添加成员请求 */
export type ProjectMemberAddInput = z.infer<typeof projectMemberAddSchema>

/** 项目列表查询参数 */
export interface ProjectListParams extends PageParams {
  status?: ProjectStatusFilter
  ownerId?: string
  /** 项目名称 / 标识 */
  keyword?: string
}

/* --------------------------------- 查询 --------------------------------- */

/** 项目模块 queryKey，写操作成功后统一失效（含顶栏项目切换器） */
export const PROJECTS_QUERY_KEY = ['projects'] as const

/** 可切换的项目列表（顶栏项目切换器） */
export const projectsQueryOptions = queryOptions({
  queryKey: PROJECTS_QUERY_KEY,
  queryFn: () => getJson('projects', z.array(projectSchema)),
})

/**
 * 项目分页列表查询配置
 * @param params - 分页与筛选参数
 */
export const projectListQueryOptions = (params: ProjectListParams) =>
  queryOptions({
    queryKey: [...PROJECTS_QUERY_KEY, 'list', params],
    queryFn: () => getJson('projects/manage', pageSchema(projectDetailSchema), { ...params }),
    placeholderData: keepPreviousData,
  })

/** 项目统计查询配置 */
export const projectStatsQueryOptions = queryOptions({
  queryKey: [...PROJECTS_QUERY_KEY, 'stats'],
  queryFn: () => getJson('projects/stats', projectStatsSchema),
})

/**
 * 项目详情查询配置
 * @param id - 项目 ID
 */
export const projectDetailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: [...PROJECTS_QUERY_KEY, 'detail', id],
    queryFn: () => getJson(`projects/${id}`, projectDetailSchema),
  })

/**
 * 项目概览查询配置
 * @param id - 项目 ID
 */
export const projectOverviewQueryOptions = (id: string) =>
  queryOptions({
    queryKey: [...PROJECTS_QUERY_KEY, 'detail', id, 'overview'],
    queryFn: () => getJson(`projects/${id}/overview`, projectOverviewSchema),
  })

/**
 * 项目成员列表查询配置
 * @param id - 项目 ID
 */
export const projectMembersQueryOptions = (id: string) =>
  queryOptions({
    queryKey: [...PROJECTS_QUERY_KEY, 'detail', id, 'members'],
    queryFn: () => getJson(`projects/${id}/members`, z.array(projectMemberSchema)),
  })

/**
 * 项目资源消耗查询配置
 * @param id - 项目 ID
 */
export const projectResourcesQueryOptions = (id: string) =>
  queryOptions({
    queryKey: [...PROJECTS_QUERY_KEY, 'detail', id, 'resources'],
    queryFn: () => getJson(`projects/${id}/resources`, projectResourcesSchema),
  })

/**
 * 项目归档影响评估查询配置
 * @param id - 项目 ID
 */
export const projectArchiveImpactQueryOptions = (id: string) =>
  queryOptions({
    queryKey: [...PROJECTS_QUERY_KEY, 'detail', id, 'archive-impact'],
    queryFn: () => getJson(`projects/${id}/archive-impact`, projectArchiveImpactSchema),
  })

/* --------------------------------- 写操作 --------------------------------- */

/**
 * 新建项目
 * @param input - 项目信息
 */
export const createProject = (input: ProjectFormInput) => sendJson('post', 'projects', input)

/**
 * 编辑项目
 * @param id - 项目 ID
 * @param input - 项目信息
 */
export const updateProject = (id: string, input: ProjectFormInput) =>
  sendJson('put', `projects/${id}`, input)

/**
 * 归档项目
 * @param id - 项目 ID
 */
export const archiveProject = (id: string) => sendJson('post', `projects/${id}/archive`)

/**
 * 恢复已归档项目
 * @param id - 项目 ID
 */
export const restoreProject = (id: string) => sendJson('post', `projects/${id}/restore`)

/**
 * 批量添加项目成员
 * @param id - 项目 ID
 * @param input - 用户与成员设置
 */
export const addProjectMembers = (id: string, input: ProjectMemberAddInput) =>
  sendJson('post', `projects/${id}/members`, input)

/**
 * 编辑项目成员
 * @param id - 项目 ID
 * @param userId - 成员用户 ID
 * @param input - 成员设置
 */
export const updateProjectMember = (id: string, userId: string, input: ProjectMemberSetting) =>
  sendJson('put', `projects/${id}/members/${userId}`, input)

/**
 * 移除项目成员
 * @param id - 项目 ID
 * @param userId - 成员用户 ID
 */
export const removeProjectMember = (id: string, userId: string) =>
  sendJson('delete', `projects/${id}/members/${userId}`)
