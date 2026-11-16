import { createFileRoute } from '@tanstack/react-router'
import { AppLayout } from '@/layouts/AppLayout'
import { requireAuth } from '@/lib/auth-guard'

// 无路径布局路由：其下页面共享顶栏与侧栏，需登录访问
export const Route = createFileRoute('/_app')({
  beforeLoad: requireAuth,
  component: AppLayout,
})
