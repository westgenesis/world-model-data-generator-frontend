import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import type { MenuProps } from 'antd'
import { Menu, Tooltip } from 'antd'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useState } from 'react'
import { AppLogo } from '@/components/AppLogo'
import type { AppPath, NavNode } from '@/config/navigation'
import { matchLeaf, NAV_TREE } from '@/config/navigation'
import { useAppStore } from '@/stores/app-store'
import { ClusterStatus } from './ClusterStatus'

/** antd Menu 菜单项类型 */
type MenuItem = Required<MenuProps>['items'][number]

/**
 * 递归地将导航树转换为 antd Menu items，支持任意层级；
 * 一级图标稍大以突出模块，子级图标缩小以保持紧凑
 * @param nodes - 导航节点
 * @param collapsed - 是否为收起态；收起态下一级弹出层顶部显示模块名标题
 * @param depth - 当前层级，从 0 开始
 * @returns Menu items
 */
const toMenuItems = (nodes: NavNode[], collapsed: boolean, depth = 0): MenuItem[] =>
  nodes.map((node): MenuItem => {
    const Icon = node.icon
    const icon = Icon ? (
      <Icon size={depth === 0 ? 17 : 15} strokeWidth={depth === 0 ? 1.85 : 1.75} />
    ) : undefined
    if (node.children?.length) {
      const children = toMenuItems(node.children, collapsed, depth + 1)
      return {
        key: node.key,
        icon,
        label: node.label,
        popupClassName: 'app-nav-popup',
        children:
          collapsed && depth === 0
            ? [{ key: `${node.key}/title`, type: 'group', label: node.label, children }]
            : children,
      }
    }
    return { key: node.to ?? node.key, icon, label: node.label }
  })

/** 导航菜单项：展开态 / 收起态（静态，避免每次渲染重建） */
const MENU_ITEMS = toMenuItems(NAV_TREE, false)
const MENU_ITEMS_COLLAPSED = toMenuItems(NAV_TREE, true)

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
  const toggleLabel = collapsed ? '展开导航' : '收起导航'

  return (
    <aside
      className={`sticky top-0 flex h-screen shrink-0 flex-col border-r border-line bg-card transition-[width] duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none ${
        collapsed ? 'w-sidebar-collapsed' : 'w-sidebar'
      }`}
    >
      <Link
        to="/"
        className="group flex h-header shrink-0 items-center gap-2.5 overflow-hidden px-4 text-fg"
      >
        <AppLogo className="shrink-0 rounded-lg shadow-sm" />
        <span
          className={`truncate text-sm leading-tight font-semibold whitespace-nowrap transition-[opacity,translate] duration-200 motion-reduce:transition-none ${
            collapsed ? 'pointer-events-none -translate-x-2 opacity-0' : 'translate-x-0 opacity-100'
          }`}
        >
          世界模型数据生成系统
        </span>
      </Link>

      <nav
        aria-label="主导航"
        className="app-nav min-h-0 flex-1 [scrollbar-width:thin] overflow-x-hidden overflow-y-auto pt-1 pb-3"
      >
        <Menu
          mode="inline"
          // 折叠态 antd 默认宽 80px，需撑满侧栏宽度以保证图标居中
          className="w-full! border-none! bg-transparent!"
          inlineCollapsed={collapsed}
          inlineIndent={14}
          selectedKeys={selectedKey ? [selectedKey] : []}
          {...(collapsed ? {} : { openKeys, onOpenChange: setOpenKeys })}
          items={collapsed ? MENU_ITEMS_COLLAPSED : MENU_ITEMS}
          onClick={({ key }) => void navigate({ to: key as AppPath })}
        />
      </nav>

      <div
        className={`flex shrink-0 gap-1.5 border-t border-line p-2 ${
          collapsed ? 'flex-col items-center' : 'items-center'
        }`}
      >
        <div className="min-w-0 flex-1">
          <ClusterStatus compact={collapsed} />
        </div>
        <Tooltip title={toggleLabel} placement="right">
          <button
            type="button"
            aria-label={toggleLabel}
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-3 transition-colors hover:bg-sunken hover:text-fg focus-visible:outline-2 focus-visible:outline-primary active:scale-95"
            onClick={toggleSidebar}
          >
            <ToggleIcon size={16} strokeWidth={1.75} />
          </button>
        </Tooltip>
      </div>
    </aside>
  )
}
