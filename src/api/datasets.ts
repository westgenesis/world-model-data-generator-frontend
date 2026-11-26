import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { DatasetType, EnabledState, TagSetType, TagSource } from '@/constants/enums'
import { getJson, sendJson } from '@/lib/http'
import type { PageParams } from './common'
import { envelope, pagedSchema } from './common'

/** 后端时间字段：不同接口时区格式不一致，仅用于展示格式化，不做严格校验 */
const dateTime = z.string()

/* --------------------------------- 数据模型 --------------------------------- */

/** 数据集 schema（对应后端 DatasetRead） */
export const datasetSchema = z.object({
  id: z.number().int(),
  project_id: z.number().int(),
  name: z.string(),
  type: z.enum(DatasetType.values),
  description: z.string().nullable(),
  state: z.enum(EnabledState.values),
  /** 归入数据集的片段数 */
  member_count: z.number().int().nullable().optional(),
  /** 数据集下的标签集数量 */
  tag_set_count: z.number().int().nullable().optional(),
  /** 数据总字节数 */
  size_bytes: z.number(),
  created_by: z.number().int().nullable(),
  created_at: dateTime,
  updated_at: dateTime,
})

/** 数据集 */
export type Dataset = z.infer<typeof datasetSchema>

/** 标签集 schema（对应后端 TagSetRead） */
export const tagSetSchema = z.object({
  id: z.number().int(),
  project_id: z.number().int(),
  dataset_id: z.number().int(),
  name: z.string(),
  type: z.enum(TagSetType.values),
  /** 取值约束：枚举型为预设值数组，数值型为范围描述字符串 */
  value_constraint: z.union([z.array(z.string()), z.string()]),
  /** 打标来源说明 */
  tag_source: z.string().nullable(),
  state: z.enum(EnabledState.values),
  /** 命中该标签集的片段数 */
  hit_count: z.number().int().nullable().optional(),
  created_by: z.number().int().nullable(),
  created_at: dateTime,
  updated_at: dateTime,
})

/** 标签集 */
export type TagSet = z.infer<typeof tagSetSchema>

/** 标签集关联数据行（对应后端 TagSeedRead） */
export const tagSeedSchema = z.object({
  seed_id: z.number().int(),
  value: z.string(),
  source: z.enum(TagSource.values),
  /** 打标来源说明 */
  source_label: z.string(),
  created_at: dateTime,
})

/** 标签集关联数据行 */
export type TagSeed = z.infer<typeof tagSeedSchema>

/* --------------------------------- 表单 / 请求 --------------------------------- */

/** 新增数据集请求 schema，同时用于表单校验 */
export const datasetCreateSchema = z.object({
  project_id: z.number('请选择所属项目').int().positive(),
  type: z.enum(DatasetType.values, '请选择数据集类型'),
  name: z
    .string('请输入数据集名称')
    .trim()
    .min(1, '请输入数据集名称')
    .max(64, '数据集名称不超过 64 个字符'),
  description: z.string().max(512, '数据集描述不超过 512 个字符'),
})

/** 新增数据集表单值 */
export type DatasetCreateValues = z.infer<typeof datasetCreateSchema>

/** 新增数据集请求体 */
export interface DatasetCreateInput {
  project_id: number
  type: DatasetType
  name: string
  description: string | null
}

/** 表单值 → 请求体：描述留空转 null */
export const toDatasetCreateInput = (values: DatasetCreateValues): DatasetCreateInput => ({
  project_id: values.project_id,
  type: values.type,
  name: values.name.trim(),
  description: values.description.trim() || null,
})

/** 编辑数据集请求 schema（局部更新：name/description/state，至少传一个） */
export const datasetUpdateSchema = z.object({
  name: z
    .string('请输入数据集名称')
    .trim()
    .min(1, '请输入数据集名称')
    .max(64, '数据集名称不超过 64 个字符'),
  description: z.string().max(512, '数据集描述不超过 512 个字符'),
  state: z.enum(EnabledState.values),
})

/** 编辑数据集表单值 */
export type DatasetUpdateValues = z.infer<typeof datasetUpdateSchema>

/** 新增标签集请求 schema，同时用于表单校验 */
export const tagSetCreateSchema = z.object({
  name: z
    .string('请输入标签集名称')
    .trim()
    .min(1, '请输入标签集名称')
    .max(64, '标签集名称不超过 64 个字符'),
  type: z.enum(TagSetType.values, '请选择标签集类型'),
  /** 取值约束：枚举型为预设值数组，数值型为范围描述字符串 */
  value_constraint: z.union([z.array(z.string()), z.string()]),
  /** 打标来源说明，可空 */
  tag_source: z.string().max(255, '打标来源说明不超过 255 个字符'),
})

/** 新增标签集表单值 */
export type TagSetCreateValues = z.infer<typeof tagSetCreateSchema>

/** 新增标签集请求体 */
export interface TagSetCreateInput {
  name: string
  type: TagSetType
  value_constraint: string[] | string
  tag_source: string | null
}

/**
 * 按类型规范化取值约束：枚举型转数组、数值型转字符串
 * @param type - 标签集类型
 * @param value - 表单中的原始取值约束
 * @returns 规范化后的取值约束
 */
export const normalizeConstraint = (
  type: TagSetType,
  value: string[] | string | undefined,
): string[] | string => {
  if (type === 'enum_type') {
    if (Array.isArray(value)) return value
    return (value ?? '')
      .split(/[,，\n]/)
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return Array.isArray(value) ? value.join('、') : (value ?? '')
}

/** 表单值 → 请求体：打标来源留空转 null */
export const toTagSetCreateInput = (values: TagSetCreateValues): TagSetCreateInput => ({
  name: values.name.trim(),
  type: values.type,
  value_constraint: normalizeConstraint(values.type, values.value_constraint),
  tag_source: values.tag_source.trim() || null,
})

/** 编辑标签集请求 schema */
export const tagSetUpdateSchema = z.object({
  name: z
    .string('请输入标签集名称')
    .trim()
    .min(1, '请输入标签集名称')
    .max(64, '标签集名称不超过 64 个字符'),
  type: z.enum(TagSetType.values, '请选择标签集类型'),
  value_constraint: z.union([z.array(z.string()), z.string()]),
  tag_source: z.string().max(255, '打标来源说明不超过 255 个字符'),
})

/** 编辑标签集表单值 */
export type TagSetUpdateValues = z.infer<typeof tagSetUpdateSchema>

/** 编辑标签集请求体 */
export interface TagSetUpdateInput {
  name?: string
  type?: TagSetType
  value_constraint?: string[] | string
  tag_source?: string | null
}

/** 编辑数据集请求体（局部更新：name/description/state，至少传一个） */
export interface DatasetUpdateInput {
  name?: string
  description?: string | null
  state?: EnabledState
}

/* --------------------------------- 查询 --------------------------------- */

/** 数据集模块 queryKey，写操作成功后统一失效 */
export const DATASETS_QUERY_KEY = ['datasets'] as const

/** 标签集模块 queryKey */
export const TAG_SETS_QUERY_KEY = ['cls', 'tag-sets'] as const

/** 标签集关联数据 queryKey */
export const TAG_SEEDS_QUERY_KEY = ['cls', 'tag-seeds'] as const

/** 数据集列表查询参数 */
export interface DatasetListParams extends PageParams {
  /** 按类型筛选 */
  type?: DatasetType
  /** 按状态筛选 */
  state?: EnabledState
  /** 名称关键词 */
  keyword?: string
}

/** 标签集列表查询参数（不含分页） */
export interface TagSetListParams {
  /** 按状态筛选 */
  state?: EnabledState
}

/**
 * 数据集分页列表查询配置
 * @param params - 分页与筛选参数
 */
export const datasetListQueryOptions = (params: DatasetListParams) =>
  queryOptions({
    queryKey: [...DATASETS_QUERY_KEY, 'list', params],
    queryFn: () =>
      getJson('v1/datasets', envelope(pagedSchema(datasetSchema)), {
        type: params.type,
        state: params.state,
        keyword: params.keyword,
        page: params.page,
        size: params.pageSize,
      }),
    placeholderData: keepPreviousData,
  })

/**
 * 数据集详情查询配置
 * @param id - 数据集 ID
 */
export const datasetDetailQueryOptions = (id: number) =>
  queryOptions({
    queryKey: [...DATASETS_QUERY_KEY, 'detail', id],
    queryFn: () => getJson(`v1/datasets/${id}`, envelope(datasetSchema)),
  })

/**
 * 数据集下标签集分页列表查询配置
 * @param datasetId - 数据集 ID
 * @param params - 分页与筛选参数
 */
export const tagSetListQueryOptions = (datasetId: number, params: TagSetListParams & PageParams) =>
  queryOptions({
    queryKey: [...TAG_SETS_QUERY_KEY, 'list', datasetId, params],
    queryFn: () =>
      getJson(`v1/cls/datasets/${datasetId}/tag-sets`, envelope(pagedSchema(tagSetSchema)), {
        state: params.state,
        page: params.page,
        size: params.pageSize,
      }),
    placeholderData: keepPreviousData,
  })

/**
 * 标签集关联数据分页列表查询配置
 * @param tagSetId - 标签集 ID
 * @param params - 分页参数
 */
export const tagSeedListQueryOptions = (tagSetId: number, params: PageParams) =>
  queryOptions({
    queryKey: [...TAG_SEEDS_QUERY_KEY, 'list', tagSetId, params],
    queryFn: () =>
      getJson(`v1/cls/tag-sets/${tagSetId}/seeds`, envelope(pagedSchema(tagSeedSchema)), {
        page: params.page,
        size: params.pageSize,
      }),
    placeholderData: keepPreviousData,
  })

/* --------------------------------- 写操作 --------------------------------- */

/**
 * 新建数据集
 * @param input - 所属项目、类型、名称与描述
 * @returns 新建的数据集
 */
export const createDataset = (input: DatasetCreateInput): Promise<Dataset> =>
  sendJson('post', 'v1/datasets', input, envelope(datasetSchema))

/**
 * 编辑数据集（含状态启停：state 传 enabled / disabled；type 不可编辑）
 * @param id - 数据集 ID
 * @param input - 要修改的字段
 * @returns 修改后的数据集
 */
export const updateDataset = (id: number, input: DatasetUpdateInput): Promise<Dataset> =>
  sendJson('put', `v1/datasets/${id}`, input, envelope(datasetSchema))

/**
 * 新增标签集
 * @param datasetId - 所属数据集 ID
 * @param input - 标签集信息
 * @returns 新建的标签集
 */
export const createTagSet = (datasetId: number, input: TagSetCreateInput): Promise<TagSet> =>
  sendJson('post', `v1/cls/datasets/${datasetId}/tag-sets`, input, envelope(tagSetSchema))

/**
 * 编辑标签集
 * @param id - 标签集 ID
 * @param input - 要修改的字段
 * @returns 修改后的标签集
 */
export const updateTagSet = (id: number, input: TagSetUpdateInput): Promise<TagSet> =>
  sendJson('put', `v1/cls/tag-sets/${id}`, input, envelope(tagSetSchema))

/**
 * 删除标签集（被片段引用时只能停用不能删）
 * @param id - 标签集 ID
 */
export const deleteTagSet = (id: number): Promise<void> =>
  sendJson('delete', `v1/cls/tag-sets/${id}`)

/**
 * 启用 / 停用标签集（停用后自动规则不再命中，存量标签保留）
 * @param id - 标签集 ID
 * @param state - enabled 启用 / disabled 停用
 * @returns 修改后的标签集
 */
export const setTagSetState = (id: number, state: EnabledState): Promise<TagSet> =>
  sendJson('put', `v1/cls/tag-sets/${id}/state`, { state }, envelope(tagSetSchema))
