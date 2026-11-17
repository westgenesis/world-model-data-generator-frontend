import { Button } from 'antd'
import { Search } from 'lucide-react'
import type { ReactNode } from 'react'

interface FilterBarProps {
  /** 筛选字段 */
  children: ReactNode
  /** 点击查询 */
  onSearch?: () => void
  /** 点击重置 */
  onReset?: () => void
}

/**
 * 列表筛选栏容器，子元素建议使用 FilterField
 * @param props - 筛选字段与查询、重置回调
 */
export const FilterBar = ({ children, onSearch, onReset }: FilterBarProps) => (
  <search
    aria-label="列表筛选"
    className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-line bg-card px-4 py-3 shadow-card"
  >
    <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-3">{children}</div>
    {(onSearch || onReset) && (
      <div className="ms-auto flex items-center gap-2 border-line sm:border-s sm:ps-4">
        {onSearch && (
          <Button type="primary" icon={<Search size={15} strokeWidth={1.75} />} onClick={onSearch}>
            查询
          </Button>
        )}
        {onReset && <Button onClick={onReset}>重置</Button>}
      </div>
    )}
  </search>
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
  <label className="flex items-center gap-2.5 text-[13px] text-fg-2 select-none">
    <span className="shrink-0">{label}</span>
    {children}
  </label>
)
