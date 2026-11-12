import { Input, InputNumber } from 'antd'
import type { ReactNode } from 'react'

interface FieldProps {
  label: ReactNode
  children: ReactNode
  /** 占满整行 */
  wide?: boolean
}

/**
 * 属性行：上方标签 + 控件
 * @param props.label - 标签
 * @param props.children - 控件
 * @param props.wide - 是否占满整行
 */
export const Field = ({ label, children, wide }: FieldProps) => (
  <label className={`flex min-w-0 flex-col gap-1 ${wide ? 'col-span-full' : ''}`}>
    <span className="text-xs text-fg-3">{label}</span>
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
