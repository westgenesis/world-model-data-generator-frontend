import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '@/components/PlaceholderPage'

/** 场景资源（参考 docs/原型/M2数据生成_原型.html） */
const Page = () => {
  return <PlaceholderPage title="场景资源" />
}

export const Route = createFileRoute('/_app/data-gen/scene-resources')({
  component: Page,
})
