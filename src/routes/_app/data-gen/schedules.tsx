import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { PlaceholderPage } from '@/components/PlaceholderPage'

/** 调度策略（参考 docs/原型/M2数据生成_原型.html） */
const Page = () => {
  const { t } = useTranslation()
  return <PlaceholderPage title={t('menu.schedules')} />
}

export const Route = createFileRoute('/_app/data-gen/schedules')({
  component: Page,
})
