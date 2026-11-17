import { useQuery } from '@tanstack/react-query'
import { projectStatsQueryOptions } from '@/api/projects'
import { StatGrid } from '@/components/StatCard'
import { formatNumber } from '@/lib/format'

/** 项目统计指标 */
export const ProjectStats = () => {
  const { data, isPending } = useQuery(projectStatsQueryOptions)

  return (
    <StatGrid
      loading={isPending}
      items={[
        { key: 'total', label: '项目总数', value: data?.total },
        { key: 'active', label: '进行中', tone: 'success', value: data?.active },
        { key: 'archived', label: '已归档', tone: 'default', value: data?.archived },
        {
          key: 'default',
          label: '默认项目',
          tone: 'info',
          value: data?.defaultCount,
        },
        { key: 'members', label: '参与人数', value: data?.memberCount },
        {
          key: 'storage',
          label: '存储已用',
          value: data?.storageUsedTb,
          fractionDigits: 1,
          unit: 'TB',
          sub: data && `参考值 ${formatNumber(data.storageQuotaTb)} TB`,
        },
      ]}
    />
  )
}
