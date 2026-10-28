import { createFileRoute, redirect } from '@tanstack/react-router'

// 首页默认进入「数据生成 → 任务管理」
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/data-gen/tasks' })
  },
})
