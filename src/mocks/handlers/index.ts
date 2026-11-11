import { notificationHandlers } from './notifications'
import { projectHandlers } from './projects'
import { userHandlers } from './users'

/** 全部 Mock 接口，新增模块时在此汇总 */
export const handlers = [...userHandlers, ...projectHandlers, ...notificationHandlers]
