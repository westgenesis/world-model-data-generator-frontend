import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import type { AuditHandleStatus } from '@/constants/enums'
import { AuditRiskLevel, AuditStatus, LogSource } from '@/constants/enums'
import { getJson, sendJson } from '@/lib/http'
import type { PageParams } from './common'
import { envelope, pagedSchema } from './common'

/* --------------------------------- 数据模型 --------------------------------- */

/** 关联用户简要信息 schema（对应后端 AuditUserBrief） */
export const auditUserBriefSchema = z.object({
  user_id: z.number().int(),
  username: z.string(),
  full_name: z.string(),
})

/** 关联用户简要信息 */
export type AuditUserBrief = z.infer<typeof auditUserBriefSchema>

/** 安全审计列表项 schema（对应后端 AuditItem，不含 extra 大字段） */
export const auditItemSchema = z.object({
  audit_id: z.number().int(),
  /** 审计时间，ISO 8601 字符串 */
  ts: z.string(),
  /** 产生这条审计记录的日志事件 key */
  event: z.string(),
  /** 安全事件类型 code，如 login_failure */
  security_type: z.string(),
  /** 安全事件类型名称，如 登录失败 */
  security_name: z.string().default(''),
  /** 风险等级 code：high / medium / low */
  risk_level: z.enum(AuditRiskLevel.values),
  /** 风险等级名称：高 / 中 / 低 */
  risk_label: z.string().default(''),
  status: z.enum(AuditStatus.values),
  description: z.string(),
  trace_id: z.string().nullable(),
  operator_id: z.number().int().nullable(),
  /** 操作人；用户不存在时为 null */
  operator: auditUserBriefSchema.nullable().default(null),
  project_id: z.number().int().nullable(),
  source: z.enum(LogSource.values),
})

/** 安全审计列表项 */
export type AuditItem = z.infer<typeof auditItemSchema>

/** 安全审计详情 schema（对应后端 AuditDetail） */
export const auditDetailSchema = auditItemSchema.extend({
  /** 产生它的日志行，可能为空 */
  log_id: z.number().int().nullable(),
  /** 事件字段（已脱敏） */
  extra: z.record(z.string(), z.unknown()).nullable(),
  handler_id: z.number().int().nullable(),
  /** 处置人；未处置或用户不存在时为 null */
  handler: auditUserBriefSchema.nullable().default(null),
  handle_note: z.string().nullable(),
  handled_at: z.string().nullable(),
  created_at: z.string(),
})

/** 安全审计详情 */
export type AuditDetail = z.infer<typeof auditDetailSchema>

/** 安全审计统计 schema（对应后端 AuditStatistics） */
export const auditStatisticsSchema = z.object({
  /** 审计记录总数 */
  total: z.number().int(),
  /** 今天的记录条数，按配置时区的自然日计算 */
  today: z.number().int(),
  /** 待处置 */
  pending: z.number().int(),
  /** 已处理 */
  handled: z.number().int(),
  /** 已忽略 */
  ignored: z.number().int(),
  /** 高风险 */
  high: z.number().int(),
  /** 中风险 */
  medium: z.number().int(),
  /** 低风险 */
  low: z.number().int(),
})

/** 安全审计统计 */
export type AuditStatistics = z.infer<typeof auditStatisticsSchema>

/* --------------------------------- 查询参数 --------------------------------- */

/** 安全审计筛选参数（与 /v1/audits 查询参数一致） */
export interface AuditFilterParams {
  /** 起始时间（含），ISO 8601 */
  start?: string
  /** 结束时间（含），ISO 8601 */
  end?: string
  /** 安全事件类型 code，如 login_failure */
  securityType?: string
  riskLevel?: AuditRiskLevel
  status?: AuditStatus
  /** 操作人 ID */
  operatorId?: number
  /** 链路标识 */
  traceId?: string
  /** 按描述或事件 key 模糊匹配 */
  keyword?: string
}

/** 安全审计列表查询参数 */
export interface AuditListParams extends AuditFilterParams, PageParams {}

/** 把筛选参数转换为请求参数，忽略空值 */
const toSearchParams = (params: AuditFilterParams): Record<string, string | number> =>
  Object.fromEntries(
    Object.entries({
      start: params.start,
      end: params.end,
      security_type: params.securityType,
      risk_level: params.riskLevel,
      status: params.status,
      operator_id: params.operatorId,
      trace_id: params.traceId,
      keyword: params.keyword,
    }).filter(
      (entry): entry is [string, string | number] =>
        entry[1] !== undefined && entry[1] !== null && entry[1] !== '',
    ),
  )

/* --------------------------------- 查询 --------------------------------- */

/** 安全审计模块 queryKey */
export const AUDITS_QUERY_KEY = ['audits'] as const

/**
 * 安全审计分页列表查询配置
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

/** 安全审计统计查询配置 */
export const auditStatisticsQueryOptions = queryOptions({
  queryKey: [...AUDITS_QUERY_KEY, 'statistics'],
  queryFn: () => getJson('v1/audits/statistics', envelope(auditStatisticsSchema)),
})

/**
 * 安全审计详情查询配置
 * @param id - 审计 ID
 * @param enabled - 是否启用查询（弹窗关闭时不请求）
 */
export const auditDetailQueryOptions = (id: number | undefined, enabled = true) =>
  queryOptions({
    queryKey: [...AUDITS_QUERY_KEY, 'detail', id],
    queryFn: () => getJson(`v1/audits/${id}`, envelope(auditDetailSchema)),
    enabled: enabled && id !== undefined,
  })

/* --------------------------------- 写操作 --------------------------------- */

/** 处置请求参数（对应后端 AuditHandleRequest） */
export interface AuditHandleInput {
  status: AuditHandleStatus
  /** 处置备注，最多 500 字 */
  note?: string | null
}

/**
 * 处置安全审计：标记已处理或标记忽略
 * @param id - 审计 ID
 * @param input - 处置结果与备注
 * @returns 处置后的审计详情
 */
export const handleAudit = (id: number, input: AuditHandleInput): Promise<AuditDetail> =>
  sendJson('post', `v1/audits/${id}/handle`, input, envelope(auditDetailSchema))
