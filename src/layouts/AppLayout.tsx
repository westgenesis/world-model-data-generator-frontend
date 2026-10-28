import { Outlet } from '@tanstack/react-router'
import { AppHeader } from './components/AppHeader'
import { Sidebar } from './components/Sidebar'

/** 主布局：左侧多级导航 + 右侧顶栏与内容区 */
export const AppLayout = () => (
  <div className="flex min-h-full">
    <Sidebar />
    <div className="flex min-w-0 flex-1 flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-[1680px] flex-1 px-6 py-6">
        <Outlet />
      </main>
    </div>
  </div>
)
