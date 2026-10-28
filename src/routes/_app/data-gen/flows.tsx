import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { PlaceholderPage } from '@/components/PlaceholderPage'

/** 流程编排方案（参考 docs/原型/M2数据生成_原型.html） */
const Page = () => {
  const { t } = useTranslation()
  return <PlaceholderPage title={t('menu.flows')} />
}

export const Route = createFileRoute('/_app/data-gen/flows')({
  component: Page,
})
