import { createFileRoute, redirect } from '@tanstack/react-router'
import { myPermissionsQueryOptions } from '@/api/auth'
import { firstAccessibleLeaf, NAV_TREE } from '@/config/navigation'
import { PERMISSION } from '@/constants/permissions'
import { createPermissionChecker } from '@/hooks/use-permissions'
import { requireAuth } from '@/lib/auth-guard'

// 首页默认进入「用户服务管理 → 用户管理」，无该权限时落到第一处可访问页面
export const Route = createFileRoute('/')({
  beforeLoad: async ({ location, context }) => {
    requireAuth({ location })
    const data = await context.queryClient.ensureQueryData(myPermissionsQueryOptions)
    const checker = createPermissionChecker(data)
    const to = checker.has(PERMISSION.userRead)
      ? '/user-service/users'
      : (firstAccessibleLeaf(NAV_TREE, checker.hasAny)?.to ?? '/forbidden')
    throw redirect({ to })
  },
})
