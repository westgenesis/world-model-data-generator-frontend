import { Input, InputNumber, Tooltip } from 'antd'
import { CircleHelp } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * 说明图标：悬停或键盘聚焦时显示次要说明，避免在界面上常驻大段提示
 * @param props.title - 说明内容
 */
export const Hint = ({ title }: { title: ReactNode }) => (
  <Tooltip title={title}>
    <span
      tabIndex={0}
      role="img"
      aria-label={typeof title === 'string' ? title : '说明'}
      className="inline-flex cursor-help rounded-full align-[-2px] text-fg-3 transition-colors hover:text-fg-2 focus-visible:outline-2 focus-visible:outline-primary"
    >
      <CircleHelp size={12} strokeWidth={1.75} />
    </span>
  </Tooltip>
)

interface FieldProps {
  label: ReactNode
  children: ReactNode
  /** 标签旁的说明（显示为问号图标 + 提示框） */
  hint?: ReactNode
  /** 占满整行 */
  wide?: boolean
}

/**
 * 属性行：上方标签 + 控件
 * @param props.label - 标签
 * @param props.children - 控件
 * @param props.hint - 标签旁的说明
 * @param props.wide - 是否占满整行
 */
export const Field = ({ label, children, hint, wide }: FieldProps) => (
  <label className={`flex min-w-0 flex-col gap-1 ${wide ? 'col-span-full' : ''}`}>
    <span className="flex items-center gap-1 text-xs text-fg-3">
      {label}
      {hint && <Hint title={hint} />}
    </span>
    {children}
  </label>
)

interface NumberFieldProps {
  value: number | undefined
  /** 失焦或回车时提交；值未变化不会触发 */
  onCommit: (value: number) => void
  step?: number
  min?: number
  max?: number
  /** 显示精度（小数位） */
  precision?: number
  suffix?: string
  disabled?: boolean
}

/**
 * 数值输入：编辑过程中不触发提交，失焦或回车时才写入文档（每次修改形成一步撤销）
 * @param props - 当前值、提交回调与输入约束
 */
export const NumberField = ({
  value,
  onCommit,
  step = 0.1,
  min,
  max,
  precision = 2,
  suffix,
  disabled,
}: NumberFieldProps) => {
  const shown = value === undefined ? undefined : Number(value.toFixed(precision))
  const commit = (raw: string) => {
    const n = Number(raw.replace(suffix ?? '', '').trim())
    if (raw.trim() === '' || !Number.isFinite(n)) return
    const clamped = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n))
    if (shown === undefined || Math.abs(clamped - shown) > 10 ** -(precision + 1)) onCommit(clamped)
  }
  return (
    <InputNumber
      // 外部值变化时重置输入框
      key={shown}
      size="small"
      className="w-full!"
      defaultValue={shown}
      step={step}
      min={min}
      max={max}
      suffix={suffix}
      disabled={disabled}
      onBlur={(e) => commit(e.target.value)}
      onPressEnter={(e) => commit((e.target as HTMLInputElement).value)}
    />
  )
}

interface TextFieldProps {
  value: string
  onCommit: (value: string) => void
  placeholder?: string
}

/**
 * 文本输入：失焦或回车时提交
 * @param props - 当前值与提交回调
 */
export const TextField = ({ value, onCommit, placeholder }: TextFieldProps) => {
  const commit = (raw: string) => {
    if (raw !== value) onCommit(raw)
  }
  return (
    <Input
      key={value}
      size="small"
      defaultValue={value}
      placeholder={placeholder}
      onBlur={(e) => commit(e.target.value)}
      onPressEnter={(e) => commit((e.target as HTMLInputElement).value)}
    />
  )
}
