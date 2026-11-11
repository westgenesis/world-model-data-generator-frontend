import { Progress } from 'antd'
import { SectionCard } from '@/components/SectionCard'
import { TONE_COLOR_VAR } from '@/constants/tone'
import { toPercent } from '@/lib/format'

/** 达到参考值该比例后进度条显示为警示色 */
const WARN_RATIO = 80

interface UsageCardProps {
  /** 资源名称 */
  title: string
  /** 已用量 */
  used: number
  /** 参考值 */
  quota: number
  /** 用量的展示文案，如「已用 18.2 TB / 参考值 30 TB」 */
  summary: string
  /** 细分指标 */
  metrics: { label: string; value: string }[]
}

/**
 * 资源用量卡片：用量进度条 + 细分指标
 * @param props - 用量与细分指标
 */
export const UsageCard = ({ title, used, quota, summary, metrics }: UsageCardProps) => {
  const percent = toPercent(used, quota)
  return (
    <SectionCard title={title} sub={summary}>
      <Progress
        percent={percent}
        strokeColor={TONE_COLOR_VAR[percent >= WARN_RATIO ? 'warning' : 'info']}
      />
      <div className="mt-3 grid grid-cols-3 gap-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-lg bg-sunken px-3 py-2">
            <div className="text-xs text-fg-3">{metric.label}</div>
            <div className="mt-0.5 font-semibold text-fg tabular-nums">{metric.value}</div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}
