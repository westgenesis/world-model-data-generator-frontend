import type { QueryClient } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Button, Result } from 'antd'

/** 路由上下文 */
interface RouterContext {
  queryClient: QueryClient
}

/** 根组件 */
const RootComponent = () => (
  <>
    <Outlet />
    {/* 官方 Devtools 仅在开发环境渲染，生产构建时会被移除 */}
    <TanStackRouterDevtools position="bottom-left" />
    <ReactQueryDevtools buttonPosition="bottom-right" />
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
