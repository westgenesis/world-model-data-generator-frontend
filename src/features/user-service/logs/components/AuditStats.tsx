import { useQuery } from '@tanstack/react-query'
import { CalendarDays, CircleAlert, Info, ShieldAlert, TriangleAlert } from 'lucide-react'
import { auditStatisticsQueryOptions } from '@/api/audits'
import { StatGrid } from '@/components/StatCard'
import { EMPTY_TEXT, formatNumber } from '@/lib/format'

/** 统计卡片图标尺寸与线宽，与页面其他图标保持一致 */
const ICON_SIZE = 16

/** 日志统计指标 */
export const AuditStats = () => {
  const { data, isPending } = useQuery(auditStatisticsQueryOptions)
  const total = data?.total ?? 0

  /**
   * 生成「占总数比例」的辅助说明
   * @param value - 指标值
   * @returns 如 `占比 12.5%`
   */
  const share = (value?: number) =>
    data ? `占比 ${formatNumber(((value ?? 0) / (total || 1)) * 100, 1)}%` : EMPTY_TEXT

  return (
    <StatGrid
      loading={isPending}
      items={[
        {
          key: 'total',
          label: '日志总数',
          value: data?.total,
          icon: <ShieldAlert size={ICON_SIZE} strokeWidth={1.75} />,
          sub: data ? `保留 ${data.retention_days} 天` : EMPTY_TEXT,
        },
        {
          key: 'today',
          label: '今日新增',
          tone: 'info',
          value: data?.today,
          icon: <CalendarDays size={ICON_SIZE} strokeWidth={1.75} />,
          sub: share(data?.today),
        },
        {
          key: 'high',
          label: '高风险',
          tone: 'danger',
          value: data?.high,
          icon: <CircleAlert size={ICON_SIZE} strokeWidth={1.75} />,
          sub: share(data?.high),
        },
        {
          key: 'medium',
          label: '中风险',
          tone: 'warning',
          value: data?.medium,
          icon: <TriangleAlert size={ICON_SIZE} strokeWidth={1.75} />,
          sub: share(data?.medium),
        },
        {
          key: 'low',
          label: '低风险',
          tone: 'info',
          value: data?.low,
          icon: <Info size={ICON_SIZE} strokeWidth={1.75} />,
          sub: share(data?.low),
        },
      ]}
    />
  )
}
