import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import type { MenuProps } from 'antd'
import { Menu, Tooltip } from 'antd'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AppLogo } from '@/components/AppLogo'
import type { AppPath, NavLeaf, NavNode } from '@/config/navigation'
import { matchLeaf, moduleOf } from '@/config/navigation'
import { useNavTree } from '@/hooks/use-nav-tree'
import { useAppStore } from '@/stores/app-store'
import { ClusterStatus } from './ClusterStatus'
import { ModuleSwitcher } from './ModuleSwitcher'

/** antd Menu 菜单项类型 */
type MenuItem = Required<MenuProps>['items'][number]

/**
 * 递归地将导航树转换为 antd Menu items，支持任意层级；
 * 一级图标稍大以突出分组，子级图标缩小以保持紧凑
 * @param nodes - 当前模块下的导航节点
 * @param collapsed - 是否为收起态；收起态下一级弹出层顶部显示分组名标题
 * @param depth - 当前层级，从 0 开始
 * @returns Menu items
 */
const toMenuItems = (nodes: NavNode[], collapsed: boolean, depth = 0): MenuItem[] =>
  nodes.map((node): MenuItem => {
    const Icon = node.icon
    const icon = Icon ? (
      <Icon size={depth === 0 ? 16 : 15} strokeWidth={depth === 0 ? 1.85 : 1.75} />
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

/**
 * 计算当前路径对应页面在所属模块内的所有祖先目录 key
 * @param pathname - 当前路由路径
 * @param leaves - 当前用户可见的叶子页面
 * @returns 祖先目录 key 列表（不含顶级模块）
 */
const ancestorKeysOf = (pathname: string, leaves: NavLeaf[]): string[] =>
  matchLeaf(pathname, leaves)
    ?.trail.slice(1, -1)
    .map((n) => n.key) ?? []

/** 左侧导航栏：Logo、当前模块导航、集群状态与收起按钮 */
export const Sidebar = () => {
  const navigate = useNavigate()
  const pathname = useLocation({ select: (l) => l.pathname })
  const collapsed = useAppStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const { modules, leaves } = useNavTree()

  const activeModule = moduleOf(pathname, leaves) ?? modules[0]

  const [openKeys, setOpenKeys] = useState(() => ancestorKeysOf(pathname, leaves))
  const [prevPathname, setPrevPathname] = useState(pathname)
  const [prevModuleKey, setPrevModuleKey] = useState(activeModule?.key)
  // 路由变化时自动展开当前页面的祖先目录；切换模块时重置为当前模块的展开项
  if (prevPathname !== pathname) {
    setPrevPathname(pathname)
    const keys = ancestorKeysOf(pathname, leaves)
    if (prevModuleKey !== activeModule?.key) {
      setPrevModuleKey(activeModule?.key)
      setOpenKeys(keys)
    } else {
      setOpenKeys((current) => [...new Set([...current, ...keys])])
    }
  }

  const menuItems = useMemo(
    () => toMenuItems(activeModule?.children ?? [], collapsed),
    [activeModule, collapsed],
  )

  if (!activeModule) return null

  const selectedKey = matchLeaf(pathname, leaves)?.node.to
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

      <div className="shrink-0 px-2.5 pt-3">
        <ModuleSwitcher />
      </div>

      <nav
        aria-label={`${activeModule.label}导航`}
        className="app-nav min-h-0 flex-1 [scrollbar-width:thin] overflow-x-hidden overflow-y-auto pt-1 pb-3"
      >
        <div key={activeModule.key} className="app-nav-module">
          <Menu
            mode="inline"
            // 折叠态 antd 默认宽 80px，需撑满侧栏宽度以保证图标居中
            className="w-full! border-none! bg-transparent!"
            inlineCollapsed={collapsed}
            inlineIndent={14}
            selectedKeys={selectedKey ? [selectedKey] : []}
            {...(collapsed ? {} : { openKeys, onOpenChange: setOpenKeys })}
            items={menuItems}
            onClick={({ key }) => void navigate({ to: key as AppPath })}
          />
        </div>
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
