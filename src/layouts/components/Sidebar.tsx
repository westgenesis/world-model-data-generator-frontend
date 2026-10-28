import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import type { MenuProps } from 'antd'
import { Button, Menu, Tooltip } from 'antd'
import type { TFunction } from 'i18next'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AppPath, NavNode } from '@/config/navigation'
import { matchLeaf, NAV_TREE } from '@/config/navigation'
import { useAppStore } from '@/stores/app-store'
import { ClusterStatus } from './ClusterStatus'

/** antd Menu 菜单项类型 */
type MenuItem = Required<MenuProps>['items'][number]

/**
 * 递归地将导航树转换为 antd Menu items，支持任意层级
 * @param nodes - 导航节点
 * @param t - 翻译函数
 * @returns Menu items
 */
const toMenuItems = (nodes: NavNode[], t: TFunction): MenuItem[] =>
  nodes.map((node): MenuItem => {
    const Icon = node.icon
    const icon = Icon ? <Icon size={18} strokeWidth={1.75} /> : undefined
    if (node.children?.length) {
      return {
        key: node.key,
        icon,
        label: t(node.labelKey),
        children: toMenuItems(node.children, t),
      }
    }
    return { key: node.to ?? node.key, icon, label: t(node.labelKey) }
  })

/**
 * 计算当前路径对应页面的所有祖先目录 key
 * @param pathname - 当前路由路径
 * @returns 祖先目录 key 列表
 */
const ancestorKeysOf = (pathname: string): string[] =>
  matchLeaf(pathname)
    ?.trail.slice(0, -1)
    .map((n) => n.key) ?? []

/** 左侧导航栏：Logo、多级菜单、集群状态与收起按钮 */
export const Sidebar = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const pathname = useLocation({ select: (l) => l.pathname })
  const collapsed = useAppStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)

  const [openKeys, setOpenKeys] = useState(() => ancestorKeysOf(pathname))
  const [prevPathname, setPrevPathname] = useState(pathname)
  // 路由变化时自动展开当前页面的祖先目录（渲染期同步，避免 effect 中 setState）
  if (prevPathname !== pathname) {
    setPrevPathname(pathname)
    setOpenKeys((keys) => [...new Set([...keys, ...ancestorKeysOf(pathname)])])
  }

  const selectedKey = matchLeaf(pathname)?.node.to
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose

  return (
    <aside
      className={`sticky top-0 flex h-screen shrink-0 flex-col border-r border-line bg-card transition-[width] duration-200 ${
        collapsed ? 'w-sidebar-collapsed' : 'w-sidebar'
      }`}
    >
      <Link
        to="/"
        className={`flex h-header shrink-0 items-center gap-2.5 text-fg ${collapsed ? 'justify-center' : 'px-5'}`}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-linear-135 from-[#22c1f5] to-[#0067c7] text-sm font-bold text-white shadow-sm">
          W
        </span>
        {!collapsed && (
          <span className="truncate text-[15px] leading-tight font-semibold">{t('app.title')}</span>
        )}
      </Link>

      <nav className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto py-2">
        <Menu
          mode="inline"
          // 折叠态 antd 默认宽 80px，需撑满侧栏宽度以保证图标居中
          className="w-full! border-none! bg-transparent!"
          inlineCollapsed={collapsed}
          inlineIndent={16}
          selectedKeys={selectedKey ? [selectedKey] : []}
          {...(collapsed ? {} : { openKeys, onOpenChange: setOpenKeys })}
          items={toMenuItems(NAV_TREE, t)}
          onClick={({ key }) => void navigate({ to: key as AppPath })}
        />
      </nav>

      <div className="shrink-0 space-y-2 border-t border-line p-3">
        <ClusterStatus compact={collapsed} />
        <Tooltip title={t('topbar.toggleNav')} placement="right">
          <Button
            type="text"
            block
            aria-label={t('topbar.toggleNav')}
            icon={<ToggleIcon size={18} strokeWidth={1.75} />}
            className="text-fg-3!"
            onClick={toggleSidebar}
          />
        </Tooltip>
      </div>
    </aside>
  )
}
