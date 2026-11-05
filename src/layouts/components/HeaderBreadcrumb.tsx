import { Link, useLocation } from '@tanstack/react-router'
import { Breadcrumb } from 'antd'
import { House } from 'lucide-react'
import { matchLeaf } from '@/config/navigation'

/** 顶栏面包屑：根据导航树自动推导当前页面的层级路径 */
export const HeaderBreadcrumb = () => {
  const pathname = useLocation({ select: (l) => l.pathname })
  const trail = matchLeaf(pathname)?.trail ?? []

  const items = [
    {
      key: 'home',
      title: (
        <Link to="/" aria-label="首页" className="inline-flex! items-center">
          <House size={15} strokeWidth={1.75} />
        </Link>
      ),
    },
    ...trail.map((node, i) => ({
      key: node.key,
      title:
        i === trail.length - 1 ? (
          <span className="font-medium text-fg">{node.label}</span>
        ) : (
          node.label
        ),
    })),
  ]

  return <Breadcrumb items={items} />
}
