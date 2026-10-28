import { Divider } from 'antd'
import { CommandPalette } from './CommandPalette'
import { HeaderBreadcrumb } from './HeaderBreadcrumb'
import { NotificationBell } from './NotificationBell'
import { ProjectSwitcher } from './ProjectSwitcher'
import { ThemeToggle } from './ThemeToggle'
import { UserMenu } from './UserMenu'

/** 顶栏：面包屑、全局搜索、项目切换、外观、消息与用户 */
export const AppHeader = () => (
  <header className="sticky top-0 z-50 flex h-header shrink-0 items-center gap-3 border-b border-line bg-card/80 px-6 backdrop-blur-md">
    <div className="min-w-0 flex-1">
      <HeaderBreadcrumb />
    </div>
    <CommandPalette />
    <ProjectSwitcher />
    <Divider orientation="vertical" className="mx-1! h-5!" />
    <div className="flex items-center gap-1">
      <ThemeToggle />
      <NotificationBell />
    </div>
    <UserMenu />
  </header>
)
