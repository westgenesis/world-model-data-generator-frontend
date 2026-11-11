import { useQuery } from '@tanstack/react-query'
import { userStatsQueryOptions } from '@/api/users'
import { StatGrid } from '@/components/StatCard'
import { formatNumber } from '@/lib/format'

/** 用户统计指标 */
export const UserStats = () => {
  const { data, isPending } = useQuery(userStatsQueryOptions)

  return (
    <StatGrid
      loading={isPending}
      items={[
        { key: 'total', label: '用户总数', value: formatNumber(data?.total) },
        { key: 'enabled', label: '活跃', tone: 'success', value: formatNumber(data?.enabled) },
        { key: 'disabled', label: '停用', tone: 'default', value: formatNumber(data?.disabled) },
        { key: 'new', label: '本月新增', value: formatNumber(data?.newThisMonth) },
      ]}
    />
  )
}
