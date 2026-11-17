import { Skeleton } from 'antd'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { TONE_DOT_CLASS } from '@/constants/tone'
import type { Tone } from '@/lib/enum'
import { EMPTY_TEXT, formatNumber } from '@/lib/format'

/** 统计卡片配置 */
export interface StatItem {
  /** 唯一键 */
  key: string
  /** 指标名称 */
  label: ReactNode
  /** 指标值：传入数字时播放递增动画，其余节点原样渲染 */
  value?: ReactNode
  /** 数值最多保留的小数位（value 为数字时生效），默认 0 */
  fractionDigits?: number
  /** 数值单位，如 TB */
  unit?: string
  /** 数值下方的辅助说明 */
  sub?: ReactNode
  /** 色点、图标与进度条的色调 */
  tone?: Tone
  /** 右上角图标 */
  icon?: ReactNode
  /** 占比（0–1），传入后在卡片底部展示进度条 */
  ratio?: number
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

/** 逐张入场的延迟类名（写成完整类名以便 Tailwind 扫描） */
const STAGGER_CLASS = [
  '[animation-delay:0ms]',
  '[animation-delay:60ms]',
  '[animation-delay:120ms]',
  '[animation-delay:180ms]',
  '[animation-delay:240ms]',
  '[animation-delay:300ms]',
]

/** 色调 → 图标底色、装饰光晕、进度条与悬停边框 */
const TONE_SURFACE: Record<Tone, { icon: string; glow: string; bar: string; border: string }> = {
  success: {
    icon: 'bg-success-soft text-success',
    glow: 'from-success-soft',
    bar: 'bg-success',
    border: 'hover:border-success/35',
  },
  warning: {
    icon: 'bg-warning-soft text-warning',
    glow: 'from-warning-soft',
    bar: 'bg-warning',
    border: 'hover:border-warning/35',
  },
  danger: {
    icon: 'bg-danger-soft text-danger',
    glow: 'from-danger-soft',
    bar: 'bg-danger',
    border: 'hover:border-danger/35',
  },
  info: {
    icon: 'bg-primary-soft text-primary',
    glow: 'from-primary-soft',
    bar: 'bg-primary',
    border: 'hover:border-primary/35',
  },
  purple: {
    icon: 'bg-purple-soft text-purple',
    glow: 'from-purple-soft',
    bar: 'bg-purple',
    border: 'hover:border-purple/35',
  },
  default: {
    icon: 'bg-sunken text-fg-2',
    glow: 'from-line',
    bar: 'bg-fg-3',
    border: 'hover:border-line-strong',
  },
}

/** 数字递增动画时长（毫秒） */
const COUNT_UP_DURATION = 800

interface AnimatedNumberProps {
  /** 目标数值 */
  value: number
  /** 最多保留的小数位 */
  fractionDigits: number
}

/**
 * 数值递增动画：从当前展示值缓动到目标值
 * @param props - 目标数值与小数位
 */
const AnimatedNumber = ({ value, fractionDigits }: AnimatedNumberProps) => {
  const [display, setDisplay] = useState(0)
  const currentRef = useRef(0)

  useEffect(() => {
    const from = currentRef.current
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      currentRef.current = value
      setDisplay(value)
      return
    }

    const start = performance.now()
    let frame = requestAnimationFrame(function tick(now) {
      const progress = Math.min(1, (now - start) / COUNT_UP_DURATION)
      // ease-out cubic：先快后慢，收尾自然
      const current = from + (value - from) * (1 - (1 - progress) ** 3)
      currentRef.current = current
      setDisplay(current)
      if (progress < 1) frame = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(frame)
  }, [value])

  return <>{formatNumber(display, fractionDigits)}</>
}

interface StatCardProps {
  /** 指标配置 */
  item: StatItem
  /** 在网格中的位置，用于计算入场延迟 */
  index: number
  /** 加载中时显示骨架 */
  loading?: boolean
}

/** 单个统计卡片 */
const StatCard = ({ item, index, loading }: StatCardProps) => {
  const tone = item.tone ?? 'default'
  const surface = TONE_SURFACE[tone]
  const percent = item.ratio === undefined ? undefined : Math.round(item.ratio * 100)

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-xl border border-line bg-card p-4 shadow-card transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:shadow-pop motion-reduce:transition-none ${surface.border} animate-fade-up motion-reduce:animate-none ${STAGGER_CLASS[index] ?? '[animation-delay:300ms]'}`}
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute -top-10 -right-8 size-24 rounded-full bg-linear-to-br ${surface.glow} to-transparent opacity-70 transition-opacity duration-300 group-hover:opacity-100`}
      />

      <div className="relative flex items-center gap-1.5">
        <i className={`size-1.5 shrink-0 rounded-full ${TONE_DOT_CLASS[tone]}`} />
        <span className="truncate text-[13px] font-medium text-fg-2">{item.label}</span>
        {item.icon && (
          <span
            className={`ms-auto flex size-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none ${surface.icon}`}
          >
            {item.icon}
          </span>
        )}
      </div>

      {loading ? (
        <Skeleton.Input active size="small" className="mt-2" />
      ) : (
        <div className="relative mt-1 text-[26px] leading-9 font-semibold tracking-tight text-fg tabular-nums">
          {typeof item.value === 'number' ? (
            <AnimatedNumber value={item.value} fractionDigits={item.fractionDigits ?? 0} />
          ) : (
            (item.value ?? EMPTY_TEXT)
          )}
          {item.unit && <span className="ms-1 text-sm font-normal text-fg-3">{item.unit}</span>}
        </div>
      )}

      {!loading && (item.sub || percent !== undefined) && (
        <div className="relative mt-auto pt-2">
          {item.sub && <div className="truncate text-xs text-fg-3">{item.sub}</div>}
          {percent !== undefined && (
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken">
                <div
                  className={`h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none ${surface.bar}`}
                  style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
                />
              </div>
              <span className="text-[11px] leading-4 text-fg-3 tabular-nums">{percent}%</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * 统计指标卡片组，移动端两列，大屏按指标数量平铺
 * @param props - 指标列表与加载状态
 */
export const StatGrid = ({ items, loading }: StatGridProps) => (
  <div
    className={`mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 ${LG_COLUMNS[items.length] ?? 'lg:grid-cols-4'}`}
  >
    {items.map((item, index) => (
      <StatCard key={item.key} item={item} index={index} loading={loading} />
    ))}
  </div>
)
