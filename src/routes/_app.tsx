import { createFileRoute } from '@tanstack/react-router'
import { AppLayout } from '@/layouts/AppLayout'

// 无路径布局路由：其下页面共享顶栏与侧栏
export const Route = createFileRoute('/_app')({
  component: AppLayout,
})
