import { useSyncExternalStore } from 'react'
import { useAppStore } from '@/stores/app-store'

/** 系统暗色偏好媒体查询 */
const DARK_QUERY = '(prefers-color-scheme: dark)'

/**
 * 订阅系统配色变化
 * @param callback - 变化时的回调
 * @returns 取消订阅函数
 */
const subscribe = (callback: () => void) => {
  const mql = window.matchMedia(DARK_QUERY)
  mql.addEventListener('change', callback)
  return () => mql.removeEventListener('change', callback)
}

/**
 * 读取系统当前是否为暗色
 * @returns 是否暗色
 */
const getSnapshot = () => window.matchMedia(DARK_QUERY).matches

/**
 * 计算当前是否处于暗色模式（综合用户设置与系统偏好）
 * @returns 是否暗色
 */
export const useIsDark = (): boolean => {
  const mode = useAppStore((s) => s.themeMode)
  const systemDark = useSyncExternalStore(subscribe, getSnapshot, () => false)
  return mode === 'dark' || (mode === 'system' && systemDark)
}
