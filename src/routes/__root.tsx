import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router'
import { Button, Result } from 'antd'
import { lazy, Suspense } from 'react'

/** 路由上下文 */
interface RouterContext {
  queryClient: QueryClient
}

/** 开发调试面板，仅在开发环境按需加载 */
const Devtools = import.meta.env.DEV
  ? lazy(async () => {
      const [{ TanStackRouterDevtools }, { ReactQueryDevtools }] = await Promise.all([
        import('@tanstack/react-router-devtools'),
        import('@tanstack/react-query-devtools'),
      ])
      return {
        default: () => (
          <>
            <TanStackRouterDevtools position="bottom-right" />
            {/* 与路由调试按钮并排，避免遮挡侧栏 */}
            <div className="fixed right-38 bottom-2 z-99999">
              <ReactQueryDevtools buttonPosition="relative" />
            </div>
          </>
        ),
      }
    })
  : () => null

/** 根组件 */
const RootComponent = () => (
  <>
    <Outlet />
    <Suspense>
      <Devtools />
    </Suspense>
  </>
)

/** 全局 404 页面 */
const NotFound = () => {
  return (
    <Result
      status="404"
      title="404"
      subTitle="页面不存在"
      extra={
        <Link to="/">
          <Button type="primary">返回首页</Button>
        </Link>
      }
    />
  )
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  notFoundComponent: NotFound,
})
