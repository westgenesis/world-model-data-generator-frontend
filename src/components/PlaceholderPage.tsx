import { Empty } from 'antd'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from './PageHeader'

interface PlaceholderPageProps {
  /** 页面标题 */
  title: ReactNode
}

/**
 * 占位页面，用于尚未实现的业务页面
 * @param props.title - 页面标题
 */
export const PlaceholderPage = ({ title }: PlaceholderPageProps) => {
  const { t } = useTranslation()
  return (
    <>
      <PageHeader title={title} />
      <div className="rounded-lg border border-line bg-card py-20">
        <Empty description={t('common.placeholderDesc')}>
          <span className="text-fg-3">{t('common.placeholder')}</span>
        </Empty>
      </div>
    </>
  )
}
