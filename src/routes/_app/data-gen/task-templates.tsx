import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { PlaceholderPage } from '@/components/PlaceholderPage'

/** 任务模板（参考 docs/原型/M2数据生成_原型.html） */
const Page = () => {
  const { t } = useTranslation()
  return <PlaceholderPage title={t('menu.taskTemplates')} />
}

export const Route = createFileRoute('/_app/data-gen/task-templates')({
  component: Page,
})
