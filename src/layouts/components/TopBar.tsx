import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import { Link, useLocation } from '@tanstack/react-router'
import { Button, Tooltip } from 'antd'
import { useTranslation } from 'react-i18next'
import { findModuleByPath, NAV_MODULES } from '@/config/navigation'
import { useAppStore } from '@/stores/app-store'
import { GlobalSearch } from './GlobalSearch'
import { NotificationBell } from './NotificationBell'
import { ProjectSwitcher } from './ProjectSwitcher'
import { UserMenu } from './UserMenu'

/** 顶栏：导航开关、Logo、一级模块切换、项目切换、搜索、消息与用户 */
export const TopBar = () => {
  const { t } = useTranslation()
  const pathname = useLocation({ select: (l) => l.pathname })
  const activeModule = findModuleByPath(pathname)
  const collapsed = useAppStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)

  return (
    <header className="sticky top-0 z-100 flex h-topbar items-center gap-4 border-b border-line bg-card px-5">
      <Tooltip title={t('topbar.toggleNav')}>
        <Button
          type="text"
          size="small"
          aria-label={t('topbar.toggleNav')}
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={toggleSidebar}
        />
      </Tooltip>

      <Link
        to="/"
        className="flex items-center gap-2.5 text-[15px] font-semibold whitespace-nowrap text-fg"
      >
        <span className="flex size-6.5 items-center justify-center rounded-sm bg-linear-135 from-primary to-[#0072c6] text-[13px] font-bold text-white">
          W
        </span>
        <span>{t('app.title')}</span>
      </Link>

      <nav className="flex flex-1 gap-0.5">
        {NAV_MODULES.map((m) => (
          <Link
            key={m.key}
            to={m.defaultTo}
            className={`rounded-sm px-4 py-1.5 whitespace-nowrap transition-colors ${
              activeModule?.key === m.key
                ? 'bg-primary-light font-medium text-primary'
                : 'text-fg-2 hover:bg-slate-100 hover:text-fg'
            }`}
          >
            {t(m.labelKey)}
          </Link>
        ))}
      </nav>

      <ProjectSwitcher />
      <GlobalSearch />
      <NotificationBell />

      <div className="flex items-center gap-3 text-xs whitespace-nowrap text-fg-2">
        <span className="hidden items-center gap-1 xl:flex">
          <span className="size-1.5 rounded-full bg-success" />
          {t('topbar.cluster', { status: t('topbar.clusterOk') })}
        </span>
        <span className="hidden xl:inline">{t('topbar.queue', { count: 3 })}</span>
        <UserMenu />
      </div>
    </header>
  )
}
