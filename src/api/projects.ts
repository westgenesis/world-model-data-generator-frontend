import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { getJson } from '@/lib/http'

/** 项目数据 schema */
export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
})

/** 项目 */
export type Project = z.infer<typeof projectSchema>

/** 项目列表查询配置 */
export const projectsQueryOptions = queryOptions({
  queryKey: ['projects'],
  queryFn: () => getJson('projects', z.array(projectSchema)),
})
