import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '@/components/PlaceholderPage'

/** 任务模板（参考 docs/原型/M2数据生成_原型.html） */
const Page = () => {
  return <PlaceholderPage title="任务模板" />
}

export const Route = createFileRoute('/_app/data-gen/task-templates')({
  component: Page,
})
