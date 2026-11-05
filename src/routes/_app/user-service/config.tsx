import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '@/components/PlaceholderPage'

/** 统一配置管理（参考 docs/原型/M1用户服务管理_原型.html） */
const Page = () => {
  return <PlaceholderPage title="统一配置管理" />
}

export const Route = createFileRoute('/_app/user-service/config')({
  component: Page,
})
