import { useLocation, useNavigate } from '@tanstack/react-router'
import type { MenuProps } from 'antd'
import { Menu } from 'antd'
import { useTranslation } from 'react-i18next'
import type { AppPath, NavModule } from '@/config/navigation'
import { findModuleByPath } from '@/config/navigation'
import { useAppStore } from '@/stores/app-store'

/** antd Menu 菜单项类型 */
type MenuItem = Required<MenuProps>['items'][number]

/**
 * 将模块导航配置转换为 antd Menu 的 items
 * @param module - 当前模块
 * @param t - 翻译函数
 * @returns Menu items
 */
const toMenuItems = (module: NavModule, t: ReturnType<typeof useTranslation>['t']): MenuItem[] =>
  module.groups.flatMap((g, i): MenuItem[] => {
    const children = g.items.map((item) => ({ key: item.to, label: t(item.labelKey) }))
    return g.labelKey
      ? [{ key: `group-${i}`, type: 'group' as const, label: t(g.labelKey), children }]
      : children
  })

/** 侧栏：展示当前一级模块下的菜单 */
export const Sidebar = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const pathname = useLocation({ select: (l) => l.pathname })
  const collapsed = useAppStore((s) => s.sidebarCollapsed)
  const module = findModuleByPath(pathname)

  if (!module) return null

  // 子页面（如详情页）也高亮其所属菜单
  const selectedKey = module.groups
    .flatMap((g) => g.items)
    .find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`))?.to

  return (
    <aside
      className={`sticky top-topbar h-[calc(100vh-var(--spacing-topbar))] shrink-0 overflow-y-auto border-line bg-card transition-[width,padding] duration-200 ${
        collapsed ? 'w-0 overflow-hidden px-0' : 'w-sidebar border-r px-2.5 py-3.5'
      }`}
    >
      <div className="px-2.5 pb-2 text-xs font-semibold text-fg-3">{t(module.labelKey)}</div>
      <Menu
        mode="inline"
        className="border-none!"
        selectedKeys={selectedKey ? [selectedKey] : []}
        items={toMenuItems(module, t)}
        onClick={({ key }) => void navigate({ to: key as AppPath })}
      />
    </aside>
  )
}
