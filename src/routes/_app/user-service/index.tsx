import { createFileRoute, redirect } from '@tanstack/react-router'
import { myPermissionsQueryOptions } from '@/api/auth'
import { firstAccessibleLeaf, NAV_MODULES } from '@/config/navigation'
import { createPermissionChecker } from '@/hooks/use-permissions'

// 模块根路径重定向到该模块第一处可访问的页面
export const Route = createFileRoute('/_app/user-service/')({
  beforeLoad: async ({ context }) => {
    const data = await context.queryClient.ensureQueryData(myPermissionsQueryOptions)
    const module = NAV_MODULES.find((item) => item.key === 'user-service')
    const to = module
      ? firstAccessibleLeaf(module.children ?? [], createPermissionChecker(data).hasAny)?.to
      : undefined
    throw redirect({ to: to ?? '/forbidden' })
  },
})
