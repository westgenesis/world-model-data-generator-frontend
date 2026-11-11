import { Button } from 'antd'
import type { ReactNode } from 'react'

interface FilterBarProps {
  /** 筛选字段 */
  children: ReactNode
  /** 点击重置 */
  onReset?: () => void
}

/**
 * 列表筛选栏容器，子元素建议使用 FilterField
 * @param props - 筛选字段与重置回调
 */
export const FilterBar = ({ children, onReset }: FilterBarProps) => (
  <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border border-line bg-card px-4 py-3 shadow-card">
    {children}
    {onReset && (
      <Button size="small" onClick={onReset}>
        重置
      </Button>
    )}
  </div>
)

interface FilterFieldProps {
  /** 字段名称 */
  label: string
  /** 输入控件 */
  children: ReactNode
}

/**
 * 筛选字段：左侧名称 + 右侧控件
 * @param props - 字段名称与控件
 */
export const FilterField = ({ label, children }: FilterFieldProps) => (
  <label className="flex items-center gap-2 text-[13px] text-fg-2">
    <span className="shrink-0">{label}</span>
    {children}
  </label>
)
