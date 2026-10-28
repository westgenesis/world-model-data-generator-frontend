import { Outlet } from '@tanstack/react-router'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'

/** 主布局：顶栏 + 侧栏 + 内容区，结构对应原型的 topbar / sidebar / main */
export const AppLayout = () => (
  <div className="min-h-full">
    <TopBar />
    <div className="flex min-h-[calc(100vh-var(--spacing-topbar))]">
      <Sidebar />
      <main className="min-w-0 flex-1 px-6 py-5">
        <Outlet />
      </main>
    </div>
  </div>
)
