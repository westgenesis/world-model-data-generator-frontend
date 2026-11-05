import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '@/components/PlaceholderPage'

/** 质量与反馈（参考 docs/原型/M4数据集管理_原型.html） */
const Page = () => {
  return <PlaceholderPage title="质量与反馈" />
}

export const Route = createFileRoute('/_app/dataset/feedback')({
  component: Page,
})
