import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '@/components/PlaceholderPage'

/** 消息中心（参考 docs/原型/M1用户服务管理_原型.html） */
const Page = () => {
  return <PlaceholderPage title="消息中心" />
}

export const Route = createFileRoute('/_app/user-service/messages')({
  component: Page,
})
