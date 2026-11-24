import type { QueryClient } from '@tanstack/react-query'
import type { ParsedLocation } from '@tanstack/react-router'
import { redirect } from '@tanstack/react-router'
import { myPermissionsQueryOptions } from '@/api/auth'
import { canAccessNode, matchLeaf } from '@/config/navigation'
import { createPermissionChecker } from '@/hooks/use-permissions'
import { isAuthenticated } from '@/stores/auth-store'

/**
 * 路由守卫：未登录时跳转登录页，并携带当前地址以便登录后返回。
 * 用于需要登录的路由的 `beforeLoad`。
 * @param ctx.location - 即将进入的地址
 */
export const requireAuth = ({ location }: { location: ParsedLocation }): void => {
  if (isAuthenticated()) return
  throw redirect({ to: '/login', search: { redirect: location.href } })
}

/**
 * 权限守卫：预取当前用户权限，页面所需权限未命中时跳转 403。
 * 依赖父级 `_app` 布局守卫已完成登录校验。
 * @param ctx.location - 即将进入的地址
 * @param ctx.context - 路由上下文，需包含 queryClient
 */
export const requirePermission = async ({
  location,
  context,
}: {
  location: ParsedLocation
  context: { queryClient: QueryClient }
}): Promise<void> => {
  const data = await context.queryClient.ensureQueryData(myPermissionsQueryOptions)
  const leaf = matchLeaf(location.pathname)
  if (leaf && !canAccessNode(leaf.node, createPermissionChecker(data).hasAny)) {
    throw redirect({ to: '/forbidden', search: { from: location.pathname } })
  }
}
