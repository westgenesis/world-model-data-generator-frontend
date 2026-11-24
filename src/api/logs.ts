import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { LogCategory, LogLevel, LogSource } from '@/constants/enums'
import { getJson, http } from '@/lib/http'
import type { PageParams } from './common'
import { envelope, pagedSchema } from './common'

/* --------------------------------- 数据模型 --------------------------------- */

/** 日志列表项 schema（对应后端 LogItem，不含 traceback / extra 大字段） */
export const logItemSchema = z.object({
  log_id: z.number().int(),
  /** 日志时间，ISO 8601 字符串 */
  ts: z.string(),
  category: z.enum(LogCategory.values),
  /** 事件 key，如 user.login */
  event: z.string(),
  level: z.enum(LogLevel.values),
  source: z.enum(LogSource.values),
  /** 事件 key 的第一段，如 user、system */
  module: z.string(),
  message: z.string(),
  trace_id: z.string().nullable(),
  operator_id: z.number().int().nullable(),
  /** 操作人用户名；没有操作人时为空字符串 */
  operator_name: z.string().default(''),
  project_id: z.number().int().nullable(),
  job_id: z.string().nullable(),
})

/** 日志列表项 */
export type LogItem = z.infer<typeof logItemSchema>

/** 日志详情 schema（对应后端 LogDetail） */
export const logDetailSchema = logItemSchema.extend({
  /** 事件字段（已脱敏） */
  extra: z.record(z.string(), z.unknown()).nullable(),
  /** 异常堆栈 */
  traceback: z.string().nullable(),
  size_bytes: z.number().int(),
})

/** 日志详情 */
export type LogDetail = z.infer<typeof logDetailSchema>

/** 日志统计 schema（对应后端 LogStatistics） */
export const logStatisticsSchema = z.object({
  /** 日志总数 */
  total: z.number().int(),
  /** 今天的日志条数，按配置时区的自然日计算 */
  today: z.number().int(),
  /** 操作日志条数 */
  operation: z.number().int(),
  /** 业务日志条数 */
  business: z.number().int(),
  /** WARNING 级别的条数 */
  warning: z.number().int(),
  /** ERROR 及以上级别的条数 */
  error: z.number().int(),
  /** 今天写入的日志字节数 */
  today_bytes: z.number().int(),
  /** 库内日志字节数 */
  total_bytes: z.number().int(),
})

/** 日志统计 */
export type LogStatistics = z.infer<typeof logStatisticsSchema>

/* --------------------------------- 查询参数 --------------------------------- */

/** 日志筛选参数（与 /v1/logs 查询参数一致） */
export interface LogFilterParams {
  /** 起始时间（含），ISO 8601 */
  start?: string
  /** 结束时间（含），ISO 8601 */
  end?: string
  category?: LogCategory
  level?: LogLevel
  /** 事件模块，如 user */
  module?: string
  /** 按内容或事件 key 模糊匹配 */
  keyword?: string
  /** 操作人 ID */
  operatorId?: number
  traceId?: string
  jobId?: string
}

/** 日志列表查询参数 */
export interface LogListParams extends LogFilterParams, PageParams {}

/** 把筛选参数转换为请求参数，忽略空值 */
const toSearchParams = (params: LogFilterParams): Record<string, string | number> =>
  Object.fromEntries(
    Object.entries({
      start: params.start,
      end: params.end,
      category: params.category,
      level: params.level,
      module: params.module,
      keyword: params.keyword,
      operator_id: params.operatorId,
      trace_id: params.traceId,
      job_id: params.jobId,
    }).filter(
      (entry): entry is [string, string | number] =>
        entry[1] !== undefined && entry[1] !== null && entry[1] !== '',
    ),
  )

/* --------------------------------- 查询 --------------------------------- */

/** 日志模块 queryKey */
export const LOGS_QUERY_KEY = ['logs'] as const

/**
 * 日志分页列表查询配置
 * @param params - 分页与筛选参数
 */
export const logListQueryOptions = (params: LogListParams) =>
  queryOptions({
    queryKey: [...LOGS_QUERY_KEY, 'list', params],
    queryFn: () =>
      getJson('v1/logs', envelope(pagedSchema(logItemSchema)), {
        ...toSearchParams(params),
        page: params.page,
        size: params.pageSize,
      }),
    placeholderData: keepPreviousData,
  })

/** 日志统计查询配置 */
export const logStatisticsQueryOptions = queryOptions({
  queryKey: [...LOGS_QUERY_KEY, 'statistics'],
  queryFn: () => getJson('v1/logs/statistics', envelope(logStatisticsSchema)),
})

/**
 * 日志详情查询配置
 * @param id - 日志 ID
 * @param enabled - 是否启用查询（弹窗关闭时不请求）
 */
export const logDetailQueryOptions = (id: number | undefined, enabled = true) =>
  queryOptions({
    queryKey: [...LOGS_QUERY_KEY, 'detail', id],
    queryFn: () => getJson(`v1/logs/${id}`, envelope(logDetailSchema)),
    enabled: enabled && id !== undefined,
  })

/**
 * 同一条链路的日志查询配置
 * @param id - 日志 ID
 * @param enabled - 是否启用查询（弹窗关闭时不请求）
 */
export const logContextQueryOptions = (id: number | undefined, enabled = true) =>
  queryOptions({
    queryKey: [...LOGS_QUERY_KEY, 'context', id],
    queryFn: () => getJson(`v1/logs/${id}/context`, envelope(z.array(logItemSchema))),
    enabled: enabled && id !== undefined,
  })

/* --------------------------------- 导出 --------------------------------- */

/** 导出文件 */
export interface LogExportFile {
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
 * 按筛选条件导出日志 CSV
 * @param params - 筛选参数（不含分页）
 * @returns 文件内容与服务端建议的文件名
 */
export const exportLogs = async (params: LogFilterParams): Promise<LogExportFile> => {
  const response = await http.get('v1/logs/export', { searchParams: toSearchParams(params) })
  return {
    blob: await response.blob(),
    filename: parseAttachmentFilename(response.headers.get('content-disposition')) ?? 'logs.csv',
  }
}
