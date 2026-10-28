import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

/** 浏览器端 Mock Service Worker */
export const worker = setupWorker(...handlers)
