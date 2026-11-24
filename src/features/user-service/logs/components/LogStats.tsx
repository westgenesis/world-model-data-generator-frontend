import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  CalendarDays,
  CircleAlert,
  ScrollText,
  TriangleAlert,
  UserCog,
} from 'lucide-react'
import { logStatisticsQueryOptions } from '@/api/logs'
import { StatGrid } from '@/components/StatCard'
import { EMPTY_TEXT, formatBytes, formatNumber } from '@/lib/format'

/** 统计卡片图标尺寸与线宽，与页面其他图标保持一致 */
const ICON_SIZE = 16

/** 日志统计指标 */
export const LogStats = () => {
  const { data, isPending } = useQuery(logStatisticsQueryOptions)

  return (
    <StatGrid
      loading={isPending}
      items={[
        {
          key: 'total',
          label: '日志总数',
          value: data?.total,
          icon: <ScrollText size={ICON_SIZE} strokeWidth={1.75} />,
          sub: data ? `库内共 ${formatBytes(data.total_bytes)}` : EMPTY_TEXT,
        },
        {
          key: 'today',
          label: '今日日志',
          tone: 'info',
          value: data?.today,
          icon: <CalendarDays size={ICON_SIZE} strokeWidth={1.75} />,
          sub: data ? `今日写入 ${formatBytes(data.today_bytes)}` : EMPTY_TEXT,
        },
        {
          key: 'operation',
          label: '操作日志',
          value: data?.operation,
          icon: <UserCog size={ICON_SIZE} strokeWidth={1.75} />,
          sub: data
            ? `占比 ${formatNumber((data.operation / (data.total || 1)) * 100, 1)}%`
            : EMPTY_TEXT,
        },
        {
          key: 'business',
          label: '业务日志',
          value: data?.business,
          icon: <Activity size={ICON_SIZE} strokeWidth={1.75} />,
          sub: data
            ? `占比 ${formatNumber((data.business / (data.total || 1)) * 100, 1)}%`
            : EMPTY_TEXT,
        },
        {
          key: 'warning',
          label: '警告日志',
          tone: 'warning',
          value: data?.warning,
          icon: <TriangleAlert size={ICON_SIZE} strokeWidth={1.75} />,
        },
        {
          key: 'error',
          label: '错误日志',
          tone: 'danger',
          value: data?.error,
          icon: <CircleAlert size={ICON_SIZE} strokeWidth={1.75} />,
        },
      ]}
    />
  )
}
