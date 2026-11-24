import type { ErrorComponentProps } from '@tanstack/react-router'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Button, Result } from 'antd'
import { AppLayout } from '@/layouts/AppLayout'
import { requireAuth, requirePermission } from '@/lib/auth-guard'

/**
 * 布局或页面加载失败时的兜底界面
 * @param props.reset - 重置当前错误边界
 */
const AppError = ({ reset }: ErrorComponentProps) => {
  const router = useRouter()

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <Result
        status="error"
        title="页面加载失败"
        subTitle="请检查网络后重试；若仍无法访问，请联系管理员确认账号权限。"
        extra={
          <Button
            type="primary"
            onClick={() => {
              reset()
              void router.invalidate()
            }}
          >
            重试
          </Button>
        }
      />
    </div>
  )
}

// 无路径布局路由：其下页面共享顶栏与侧栏，需登录且拥有页面权限
export const Route = createFileRoute('/_app')({
  beforeLoad: async (ctx) => {
    requireAuth(ctx)
    await requirePermission(ctx)
  },
  component: AppLayout,
  errorComponent: AppError,
})
