import { createFileRoute } from '@tanstack/react-router'
import { DepartmentManagementPage } from '@/features/user-service/departments/DepartmentManagementPage'

export const Route = createFileRoute('/_app/user-service/departments')({
  component: DepartmentManagementPage,
})
