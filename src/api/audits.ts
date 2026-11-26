import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { AuditRiskLevel, LogSource } from '@/constants/enums'
import { getJson, http } from '@/lib/http'
import type { PageParams } from './common'
import { envelope, pagedSchema } from './common'

/* --------------------------------- 数据模型 --------------------------------- */

/** 审计日志列表项 schema（对应后端 AuditItem） */
export const auditItemSchema = z.object({
  audit_id: z.number().int(),
  /** 审计时间，ISO 8601 字符串 */
  ts: z.string(),
  operator_id: z.number().int().nullable(),
  /** 操作人姓名快照；无操作人时为 null */
  operator_name: z.string().nullable(),
  /** 客户端 IP */
  ip: z.string().nullable(),
  /** 写入进程：api / worker */
  source: z.enum(LogSource.values),
  /** 大模块，如 user / system */
  module: z.string(),
  /** 子模块，如 account / department */
  sub_module: z.string(),
  /** 被操作对象类型，如 account */
  object_type: z.string().nullable(),
  object_id: z.number().int().nullable(),
  /** 对象名称快照 */
  object_name: z.string().nullable(),
  /** 具体动作，如 create / update / login */
  action: z.string(),
  /** 事件 key，三段式，如 user.account.create */
  event: z.string(),
  /** 渲染后的事实描述 */
  message: z.string(),
  project_id: z.number().int().nullable(),
  /** 风险等级 code：high / medium / low */
  risk_level: z.enum(AuditRiskLevel.values).nullable(),
  /** 风险等级名称：高 / 中 / 低 */
  risk_label: z.string().default(''),
  trace_id: z.string().nullable(),
})

/** 审计日志列表项 */
export type AuditItem = z.infer<typeof auditItemSchema>

/** 审计日志详情 schema（对应后端 AuditDetail） */
export const auditDetailSchema = auditItemSchema.extend({
  /** 事件字段与变更前后 */
  detail: z.record(z.string(), z.unknown()).nullable(),
})

/** 审计日志详情 */
export type AuditDetail = z.infer<typeof auditDetailSchema>

/** 审计统计 schema（对应后端 AuditStatistics） */
export const auditStatisticsSchema = z.object({
  /** 审计记录总数 */
  total: z.number().int(),
  /** 今天的记录条数，按配置时区的自然日计算 */
  today: z.number().int(),
  /** 高风险条数 */
  high: z.number().int(),
  /** 中风险条数 */
  medium: z.number().int(),
  /** 低风险条数 */
  low: z.number().int(),
  /** 审计日志存储时间（天），取自系统配置 */
  retention_days: z.number().int(),
})

/** 审计统计 */
export type AuditStatistics = z.infer<typeof auditStatisticsSchema>

/* --------------------------------- 查询参数 --------------------------------- */

/** 审计日志筛选参数（与 /v1/audits 查询参数一致） */
export interface AuditFilterParams {
  /** 起始时间（含），ISO 8601 */
  start?: string
  /** 结束时间（含），ISO 8601 */
  end?: string
  /** 大模块，如 user */
  module?: string
  /** 子模块，如 account */
  subModule?: string
  /** 具体动作，如 create */
  action?: string
  /** 事件 key，如 user.account.create */
  event?: string
  riskLevel?: AuditRiskLevel
  /** 操作人用户名，精确匹配 */
  operatorName?: string
  /** 被操作对象类型，如 account */
  objectType?: string
  /** 被操作对象 ID */
  objectId?: number
  /** 链路标识 */
  traceId?: string
  /** 按描述、事件 key、操作人或对象名模糊匹配 */
  keyword?: string
}

/** 审计日志列表查询参数 */
export interface AuditListParams extends AuditFilterParams, PageParams {}

/** 把筛选参数转换为请求参数，忽略空值 */
const toSearchParams = (params: AuditFilterParams): Record<string, string | number> =>
  Object.fromEntries(
    Object.entries({
      start: params.start,
      end: params.end,
      module: params.module,
      sub_module: params.subModule,
      action: params.action,
      event: params.event,
      risk_level: params.riskLevel,
      operator_name: params.operatorName,
      object_type: params.objectType,
      object_id: params.objectId,
      trace_id: params.traceId,
      keyword: params.keyword,
    }).filter(
      (entry): entry is [string, string | number] =>
        entry[1] !== undefined && entry[1] !== null && entry[1] !== '',
    ),
  )

/* --------------------------------- 查询 --------------------------------- */

/** 审计日志模块 queryKey */
export const AUDITS_QUERY_KEY = ['audits'] as const

/**
 * 审计日志分页列表查询配置
 * @param params - 分页与筛选参数
 */
export const auditListQueryOptions = (params: AuditListParams) =>
  queryOptions({
    queryKey: [...AUDITS_QUERY_KEY, 'list', params],
    queryFn: () =>
      getJson('v1/audits', envelope(pagedSchema(auditItemSchema)), {
        ...toSearchParams(params),
        page: params.page,
        size: params.pageSize,
      }),
    placeholderData: keepPreviousData,
  })

/** 审计统计查询配置 */
export const auditStatisticsQueryOptions = queryOptions({
  queryKey: [...AUDITS_QUERY_KEY, 'statistics'],
  queryFn: () => getJson('v1/audits/statistics', envelope(auditStatisticsSchema)),
})

/**
 * 审计日志详情查询配置
 * @param id - 审计 ID
 * @param enabled - 是否启用查询（弹窗关闭时不请求）
 */
export const auditDetailQueryOptions = (id: number | undefined, enabled = true) =>
  queryOptions({
    queryKey: [...AUDITS_QUERY_KEY, 'detail', id],
    queryFn: () => getJson(`v1/audits/${id}`, envelope(auditDetailSchema)),
    enabled: enabled && id !== undefined,
  })

/* --------------------------------- 导出 --------------------------------- */

/** 导出文件 */
export interface AuditExportFile {
  blob: Blob
  filename: string
}

/**
 * 解析 Content-Disposition 中的文件名
 * @param header - 响应头
 * @returns 文件名；无法解析时为 null
 */
const parseAttachmentFilename = (header: string | null): string | null => {
  if (!header) return null
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (encoded) return decodeURIComponent(encoded[1])
  return /filename="?([^";]+)"?/i.exec(header)?.[1] ?? null
}

/**
 * 按筛选条件导出审计日志 CSV
 * @param params - 筛选参数（不含分页）
 * @returns 文件内容与服务端建议的文件名
 */
export const exportAudits = async (params: AuditFilterParams): Promise<AuditExportFile> => {
  const response = await http.get('v1/audits/export', { searchParams: toSearchParams(params) })
  return {
    blob: await response.blob(),
    filename: parseAttachmentFilename(response.headers.get('content-disposition')) ?? 'audits.csv',
  }
}
