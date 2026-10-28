import { Link, useLocation } from '@tanstack/react-router'
import { Breadcrumb } from 'antd'
import { House } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { matchLeaf } from '@/config/navigation'

/** 顶栏面包屑：根据导航树自动推导当前页面的层级路径 */
export const HeaderBreadcrumb = () => {
  const { t } = useTranslation()
  const pathname = useLocation({ select: (l) => l.pathname })
  const trail = matchLeaf(pathname)?.trail ?? []

  const items = [
    {
      key: 'home',
      title: (
        <Link to="/" aria-label={t('topbar.home')} className="inline-flex! items-center">
          <House size={15} strokeWidth={1.75} />
        </Link>
      ),
    },
    ...trail.map((node, i) => ({
      key: node.key,
      title:
        i === trail.length - 1 ? (
          <span className="font-medium text-fg">{t(node.labelKey)}</span>
        ) : (
          t(node.labelKey)
        ),
    })),
  ]

  return <Breadcrumb items={items} />
}
