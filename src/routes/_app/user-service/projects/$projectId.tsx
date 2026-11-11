import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ProjectDetailTab } from '@/constants/enums'
import { ProjectDetailPage } from '@/features/user-service/projects/ProjectDetailPage'

/** 详情页查询参数：当前页签 */
const searchSchema = z.object({
  tab: z.enum(ProjectDetailTab.values).optional().catch(undefined),
})

export const Route = createFileRoute('/_app/user-service/projects/$projectId')({
  validateSearch: searchSchema,
  component: ProjectDetailPage,
})
