import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router'
import { Button, Result } from 'antd'
import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'

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
            <ReactQueryDevtools buttonPosition="bottom-left" />
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
  const { t } = useTranslation()
  return (
    <Result
      status="404"
      title="404"
      subTitle={t('common.notFound')}
      extra={
        <Link to="/">
          <Button type="primary">{t('common.backHome')}</Button>
        </Link>
      }
    />
  )
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  notFoundComponent: NotFound,
})
