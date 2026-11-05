import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '@/components/PlaceholderPage'

/** 调度策略（参考 docs/原型/M2数据生成_原型.html） */
const Page = () => {
  return <PlaceholderPage title="调度策略" />
}

export const Route = createFileRoute('/_app/data-gen/schedules')({
  component: Page,
})
