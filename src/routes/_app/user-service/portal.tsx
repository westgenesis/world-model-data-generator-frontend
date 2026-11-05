import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '@/components/PlaceholderPage'

/** 门户个性化（参考 docs/原型/M1用户服务管理_原型.html） */
const Page = () => {
  return <PlaceholderPage title="门户个性化" />
}

export const Route = createFileRoute('/_app/user-service/portal')({
  component: Page,
})
