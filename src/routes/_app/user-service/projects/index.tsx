import { createFileRoute } from '@tanstack/react-router'
import { ProjectListPage } from '@/features/user-service/projects/ProjectListPage'

export const Route = createFileRoute('/_app/user-service/projects/')({
  component: ProjectListPage,
})
