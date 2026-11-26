import { createFileRoute } from '@tanstack/react-router'
import { ProjectDetailPage } from '@/features/user-service/projects/ProjectDetailPage'

export const Route = createFileRoute('/_app/user-service/projects/$projectId')({
  component: ProjectDetailPage,
})
