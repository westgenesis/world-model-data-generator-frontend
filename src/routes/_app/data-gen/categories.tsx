import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { PlaceholderPage } from '@/components/PlaceholderPage'

/** 数据分类管理（参考 docs/原型/M2数据生成_原型.html） */
const Page = () => {
  const { t } = useTranslation()
  return <PlaceholderPage title={t('menu.categories')} />
}

export const Route = createFileRoute('/_app/data-gen/categories')({
  component: Page,
})
