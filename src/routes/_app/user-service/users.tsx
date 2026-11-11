import { createFileRoute } from '@tanstack/react-router'
import { UserManagementPage } from '@/features/user-service/users/UserManagementPage'

export const Route = createFileRoute('/_app/user-service/users')({
  component: UserManagementPage,
})
