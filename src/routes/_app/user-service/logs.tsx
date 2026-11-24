import { createFileRoute } from '@tanstack/react-router'
import { LogManagementPage } from '@/features/user-service/logs/LogManagementPage'

export const Route = createFileRoute('/_app/user-service/logs')({
  component: LogManagementPage,
})
