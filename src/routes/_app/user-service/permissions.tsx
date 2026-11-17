import { createFileRoute } from '@tanstack/react-router'
import { PermissionsManagementPage } from '@/features/user-service/permissions/PermissionsManagementPage'

/** 权限管理（参考 docs/原型/M1用户服务管理_原型.html） */
const Page = () => {
  return <PermissionsManagementPage />
}

export const Route = createFileRoute('/_app/user-service/permissions')({
  component: Page,
})
