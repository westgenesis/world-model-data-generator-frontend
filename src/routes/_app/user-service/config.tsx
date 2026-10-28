import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { PlaceholderPage } from '@/components/PlaceholderPage'

/** 统一配置管理（参考 docs/原型/M1用户服务管理_原型.html） */
const Page = () => {
  const { t } = useTranslation()
  return <PlaceholderPage title={t('menu.config')} />
}

export const Route = createFileRoute('/_app/user-service/config')({
  component: Page,
})
