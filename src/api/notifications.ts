import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { getJson } from '@/lib/http'

/** 消息通知 schema */
export const notificationSchema = z.object({
  id: z.string(),
  level: z.enum(['success', 'warning', 'danger', 'info']),
  title: z.string(),
  description: z.string(),
  createdAt: z.iso.datetime(),
})

/** 消息通知 */
export type Notification = z.infer<typeof notificationSchema>

/** 最新消息列表查询配置（每分钟轮询一次） */
export const latestNotificationsQueryOptions = queryOptions({
  queryKey: ['notifications', 'latest'],
  queryFn: () => getJson('notifications/latest', z.array(notificationSchema)),
  refetchInterval: 60_000,
})
