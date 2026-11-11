import type { TagProps } from 'antd'
import type { Tone } from '@/lib/enum'

/** 色调 → antd Tag 颜色 */
export const TONE_TAG_COLOR: Record<Tone, TagProps['color']> = {
  success: 'success',
  warning: 'warning',
  danger: 'error',
  info: 'processing',
  purple: 'purple',
  default: 'default',
}

/** 色调 → 圆点背景色（语义 token，适配暗色模式） */
export const TONE_DOT_CLASS: Record<Tone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-primary',
  purple: 'bg-purple',
  default: 'bg-fg-3',
}

/** 色调 → CSS 颜色值（用于 antd Timeline、Progress 等接收颜色字符串的组件） */
export const TONE_COLOR_VAR: Record<Tone, string> = {
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
  info: 'var(--color-primary)',
  purple: 'var(--color-purple)',
  default: 'var(--color-fg-3)',
}
