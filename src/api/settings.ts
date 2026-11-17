import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { getJson, sendJson } from '@/lib/http'
import { envelope } from './common'

/* --------------------------------- 数据模型 --------------------------------- */

/** 系统配置项 schema（对应后端 SettingItem，值统一为字符串） */
export const settingItemSchema = z.object({
  key: z.string(),
  display: z.string(),
  value: z.string(),
})

/** 系统配置项 */
export type SettingItem = z.infer<typeof settingItemSchema>

/** 单条配置的修改内容（对应后端 SettingUpdate） */
export interface SettingUpdate {
  /** 配置标识 */
  key: string
  /** 新的值 */
  value: string
}

/* --------------------------------- 查询 --------------------------------- */

/** 系统配置 queryKey，写操作成功后统一失效 */
export const SETTINGS_QUERY_KEY = ['settings'] as const

/** 系统配置查询配置（后端返回全部配置项） */
export const settingsQueryOptions = queryOptions({
  queryKey: [...SETTINGS_QUERY_KEY, 'list'],
  queryFn: () => getJson('v1/settings', envelope(z.array(settingItemSchema))),
  staleTime: 60_000,
})

/* --------------------------------- 写操作 --------------------------------- */

/**
 * 批量修改系统配置
 * @param items - 要修改的配置项（key + value）
 * @returns 修改后的全部配置项
 */
export const updateSettings = (items: SettingUpdate[]): Promise<SettingItem[]> =>
  sendJson('put', 'v1/settings', { items }, envelope(z.array(settingItemSchema)))
