import { createFileRoute, redirect } from '@tanstack/react-router'

// 模块根路径重定向到默认落地页
export const Route = createFileRoute('/_app/user-service/')({
  beforeLoad: () => {
    throw redirect({ to: '/user-service/users' })
  },
})
