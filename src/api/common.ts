import { z } from 'zod'

/** 分页查询的公共参数 */
export interface PageParams {
  /** 页码，从 1 开始 */
  page: number
  /** 每页条数 */
  pageSize: number
}

/**
 * 生成分页响应 schema（约定格式，后端提供接口后按实际字段调整此处即可）
 * @param item - 列表项 schema
 * @returns `{ list, total }` 结构的 schema
 */
export const pageSchema = <T extends z.ZodType>(item: T) =>
  z.object({
    list: z.array(item),
    total: z.number().int().nonnegative(),
  })

/** 分页响应 */
export interface PageResult<T> {
  list: T[]
  total: number
}

/** 可空的 ISO 时间字符串 */
export const nullableDateTime = z.iso.datetime().nullable()
