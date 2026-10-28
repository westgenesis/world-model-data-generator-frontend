import { http, HttpResponse } from 'msw'
import type { Notification } from '@/api/notifications'

/**
 * 生成距当前时间若干分钟前的 ISO 时间串
 * @param minutes - 分钟数
 * @returns ISO 8601 时间字符串
 */
const minutesAgo = (minutes: number): string =>
  new Date(Date.now() - minutes * 60_000).toISOString()

/** 消息 Mock 数据，取自原型 */
const notifications: Notification[] = [
  {
    id: 'N-1',
    level: 'danger',
    title: '任务「城市路口-雨天-批量生成-11」执行失败',
    description: '失败原因：节点「数据生成」输出校验不通过',
    createdAt: minutesAgo(3),
  },
  {
    id: 'N-2',
    level: 'success',
    title: '任务「高速切入-批量生成-08」已完成',
    description: '产出 1,860 段，质检通过率 92.4%',
    createdAt: minutesAgo(26),
  },
  {
    id: 'N-3',
    level: 'warning',
    title: '人工复核待办已分配给你 12 条',
    description: '批次 QC-20260916-03',
    createdAt: minutesAgo(60),
  },
  {
    id: 'N-4',
    level: 'info',
    title: '资源消耗提醒：城市道路数据项目',
    description: '本月生成消耗已达参考值的 82%，仅作提醒，不影响运行',
    createdAt: minutesAgo(120),
  },
]

export const notificationHandlers = [
  http.get('*/api/notifications/latest', () => HttpResponse.json(notifications)),
]
