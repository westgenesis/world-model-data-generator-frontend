import { createFileRoute } from '@tanstack/react-router'
import { ForbiddenPage } from '@/features/auth/ForbiddenPage'

// 无权限访问的提示页：不在导航树中，本身不要求任何权限
export const Route = createFileRoute('/_app/forbidden')({
  validateSearch: (search: Record<string, unknown>) => ({
    from: typeof search.from === 'string' ? search.from : undefined,
  }),
  component: ForbiddenPage,
})
