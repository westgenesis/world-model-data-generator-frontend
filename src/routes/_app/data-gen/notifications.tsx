import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '@/components/PlaceholderPage'

/** 日志与通知（参考 docs/原型/M2数据生成_原型.html） */
const Page = () => {
  return <PlaceholderPage title="日志与通知" />
}

export const Route = createFileRoute('/_app/data-gen/notifications')({
  component: Page,
})
