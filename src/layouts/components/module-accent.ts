import type { ModuleAccent } from '@/config/navigation'

/** 模块强调色对应的 Tailwind 类，集中维护避免组件内重复拼接 */
interface ModuleAccentStyle {
  /** 图标底色与前景色 */
  tile: string
  /** 强调色文字 */
  text: string
  /** 强调色指示点 */
  dot: string
  /** 当前模块卡片底色 */
  active: string
}

/** 按强调色查表；使用完整类名以保证 Tailwind 能静态扫描到 */
export const MODULE_ACCENT: Record<ModuleAccent, ModuleAccentStyle> = {
  primary: {
    tile: 'bg-primary-soft text-primary',
    text: 'text-primary',
    dot: 'bg-primary',
    active: 'bg-primary-soft',
  },
  purple: {
    tile: 'bg-purple-soft text-purple',
    text: 'text-purple',
    dot: 'bg-purple',
    active: 'bg-purple-soft',
  },
  warning: {
    tile: 'bg-warning-soft text-warning',
    text: 'text-warning',
    dot: 'bg-warning',
    active: 'bg-warning-soft',
  },
  success: {
    tile: 'bg-success-soft text-success',
    text: 'text-success',
    dot: 'bg-success',
    active: 'bg-success-soft',
  },
}
