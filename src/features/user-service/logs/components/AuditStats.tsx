import { useQuery } from '@tanstack/react-query'
import {
  CalendarDays,
  CircleAlert,
  ClockAlert,
  Info,
  ShieldAlert,
  TriangleAlert,
} from 'lucide-react'
import { auditStatisticsQueryOptions } from '@/api/audits'
import { StatGrid } from '@/components/StatCard'
import { EMPTY_TEXT, formatNumber } from '@/lib/format'

/** 统计卡片图标尺寸与线宽，与页面其他图标保持一致 */
const ICON_SIZE = 16

/** 安全审计统计指标 */
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
          label: '审计总数',
          value: data?.total,
          icon: <ShieldAlert size={ICON_SIZE} strokeWidth={1.75} />,
          sub: data
            ? `已处理 ${formatNumber(data.handled)} · 已忽略 ${formatNumber(data.ignored)}`
            : EMPTY_TEXT,
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
          key: 'pending',
          label: '待处置',
          tone: 'warning',
          value: data?.pending,
          icon: <ClockAlert size={ICON_SIZE} strokeWidth={1.75} />,
          sub: share(data?.pending),
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
