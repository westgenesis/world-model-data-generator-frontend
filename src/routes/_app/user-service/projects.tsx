import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '@/components/PlaceholderPage'

/** 项目管理（参考 docs/原型/M1用户服务管理_原型.html） */
const Page = () => {
  return <PlaceholderPage title="项目管理" />
}

export const Route = createFileRoute('/_app/user-service/projects')({
  component: Page,
})
