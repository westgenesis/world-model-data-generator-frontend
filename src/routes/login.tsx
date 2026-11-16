import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { LoginPage } from '@/features/auth/LoginPage'
import { isAuthenticated } from '@/stores/auth-store'

/** 查询参数：登录成功后返回的站内地址 */
const searchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
})

/** 登录页：全屏独立页面，不使用主布局；已登录时直接进入系统 */
export const Route = createFileRoute('/login')({
  validateSearch: searchSchema,
  beforeLoad: () => {
    if (isAuthenticated()) throw redirect({ to: '/' })
  },
  component: LoginPage,
})
