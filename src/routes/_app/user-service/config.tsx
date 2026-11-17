import { createFileRoute } from '@tanstack/react-router'
import { ConfigManagementPage } from '@/features/user-service/config/ConfigManagementPage'

/** 统一配置管理（参考 docs/原型/M1用户服务管理_原型.html） */
const Page = () => {
  return <ConfigManagementPage />
}

export const Route = createFileRoute('/_app/user-service/config')({
  component: Page,
})
