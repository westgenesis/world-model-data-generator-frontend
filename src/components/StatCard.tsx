import { Skeleton } from 'antd'
import type { ReactNode } from 'react'
import { TONE_DOT_CLASS } from '@/constants/tone'
import type { Tone } from '@/lib/enum'

/** 统计卡片配置 */
export interface StatItem {
  /** 唯一键 */
  key: string
  /** 指标名称 */
  label: ReactNode
  /** 指标值 */
  value: ReactNode
  /** 数值单位，如 TB */
  unit?: string
  /** 数值下方的辅助说明 */
  sub?: ReactNode
  /** 名称前的色点 */
  tone?: Tone
}

interface StatGridProps {
  /** 指标列表 */
  items: StatItem[]
  /** 加载中时显示骨架 */
  loading?: boolean
}

/** 不同指标数量下的大屏列数（写成完整类名以便 Tailwind 扫描） */
const LG_COLUMNS: Record<number, string> = {
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
  6: 'lg:grid-cols-6',
}

/**
 * 统计指标卡片组，移动端两列，大屏按指标数量平铺
 * @param props - 指标列表与加载状态
 */
export const StatGrid = ({ items, loading }: StatGridProps) => (
  <div
    className={`mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 ${LG_COLUMNS[items.length] ?? 'lg:grid-cols-4'}`}
  >
    {items.map((item) => (
      <div key={item.key} className="rounded-xl border border-line bg-card px-4 py-3.5 shadow-card">
        <div className="flex items-center gap-1.5 text-[13px] text-fg-2">
          {item.tone && <i className={`size-1.5 rounded-full ${TONE_DOT_CLASS[item.tone]}`} />}
          {item.label}
        </div>
        {loading ? (
          <Skeleton.Input active size="small" className="mt-2" />
        ) : (
          <div className="mt-1 text-2xl leading-8 font-semibold text-fg tabular-nums">
            {item.value}
            {item.unit && <span className="ms-1 text-sm font-normal text-fg-3">{item.unit}</span>}
          </div>
        )}
        {item.sub && <div className="mt-0.5 text-xs text-fg-3">{item.sub}</div>}
      </div>
    ))}
  </div>
)
