import { z } from 'zod'

/** 环境变量校验 schema，启动时校验以尽早暴露配置错误 */
const envSchema = z.object({
  VITE_API_BASE_URL: z.string().default('/api'),
  VITE_ENABLE_MOCK: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
})

/** 已校验的环境变量 */
export const env = envSchema.parse(import.meta.env)
