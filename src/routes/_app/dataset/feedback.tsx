import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { PlaceholderPage } from '@/components/PlaceholderPage'

/** 质量与反馈（参考 docs/原型/M4数据集管理_原型.html） */
const Page = () => {
  const { t } = useTranslation()
  return <PlaceholderPage title={t('menu.feedback')} />
}

export const Route = createFileRoute('/_app/dataset/feedback')({
  component: Page,
})
