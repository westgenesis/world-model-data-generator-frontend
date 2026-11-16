import type { ParsedLocation } from '@tanstack/react-router'
import { redirect } from '@tanstack/react-router'
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
