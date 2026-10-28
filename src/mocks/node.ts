import { setupServer } from 'msw/node'
import { handlers } from './handlers'

/** Node 端 Mock 服务（用于 Vitest） */
export const server = setupServer(...handlers)
