import { delay } from 'msw'
import type { PageResult } from '@/api/common'

/**
 * 从请求 URL 中读取分页参数并对数组分页
 * @param items - 完整数据
 * @param url - 请求 URL
 * @returns 分页结果
 */
export const paginate = <T>(items: T[], url: URL): PageResult<T> => {
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
  const pageSize = Math.max(1, Number(url.searchParams.get('pageSize')) || 20)
  return { list: items.slice((page - 1) * pageSize, page * pageSize), total: items.length }
}

/**
 * 判断任一字段是否包含关键词（忽略大小写）；关键词为空时视为匹配
 * @param keyword - 关键词
 * @param fields - 待匹配字段
 * @returns 是否匹配
 */
export const matchKeyword = (keyword: string | null, ...fields: string[]): boolean => {
  const kw = keyword?.trim().toLowerCase()
  return !kw || fields.some((f) => f.toLowerCase().includes(kw))
}

/** 模拟网络延迟，便于观察加载态 */
export const mockLatency = () => delay(300)

/**
 * 生成距当前时间若干分钟前的 ISO 时间串
 * @param minutes - 分钟数
 * @returns ISO 8601 时间字符串
 */
export const minutesAgo = (minutes: number): string =>
  new Date(Date.now() - minutes * 60_000).toISOString()

/**
 * 将日期字符串转为 ISO 时间串
 * @param date - 形如 2026-03-12 的日期
 * @returns ISO 8601 时间字符串
 */
export const isoDate = (date: string): string => new Date(`${date}T00:00:00+08:00`).toISOString()
