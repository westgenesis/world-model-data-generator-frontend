import { createFileRoute, redirect } from '@tanstack/react-router'

// 首页默认进入「用户服务管理 → 用户管理」
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/user-service/users' })
  },
})
