import { useQuery } from '@tanstack/react-query'
import { Clock, UserCheck, UserPlus, Users, UserX } from 'lucide-react'
import { userStatsQueryOptions } from '@/api/users'
import { StatGrid } from '@/components/StatCard'

/** 统计卡片图标尺寸与线宽，与页面其他图标保持一致 */
const ICON_SIZE = 16

/** 用户统计指标 */
export const UserStats = () => {
  const { data, isPending } = useQuery(userStatsQueryOptions)
  const total = data?.total

  return (
    <StatGrid
      loading={isPending}
      items={[
        {
          key: 'total',
          label: '用户总数',
          value: data?.total,
          icon: <Users size={ICON_SIZE} strokeWidth={1.75} />,
        },
        {
          key: 'active',
          label: '启用',
          tone: 'success',
          value: data?.active,
          icon: <UserCheck size={ICON_SIZE} strokeWidth={1.75} />,
          ratio: total ? (data?.active ?? 0) / total : undefined,
        },
        {
          key: 'pending',
          label: '待激活',
          tone: 'warning',
          value: data?.pending,
          icon: <Clock size={ICON_SIZE} strokeWidth={1.75} />,
          ratio: total ? (data?.pending ?? 0) / total : undefined,
        },
        {
          key: 'disabled',
          label: '停用',
          tone: 'default',
          value: data?.disabled,
          icon: <UserX size={ICON_SIZE} strokeWidth={1.75} />,
          ratio: total ? (data?.disabled ?? 0) / total : undefined,
        },
        {
          key: 'new',
          label: '本月新增',
          tone: 'info',
          value: data?.new_this_month,
          icon: <UserPlus size={ICON_SIZE} strokeWidth={1.75} />,
        },
      ]}
    />
  )
}
