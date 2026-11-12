import { useCallback, useEffect, useState } from 'react'

/** 已看过引导的标记（localStorage，按浏览器记录，版本号变化时重新展示） */
const TOUR_KEY = 'wmdg-scene-editor-tour:v1'

/**
 * 是否已看过引导（存储不可用时视为已看过，避免每次都弹出）
 * @returns 是否已看过
 */
const hasSeenTour = () => {
  try {
    return localStorage.getItem(TOUR_KEY) === 'done'
  } catch {
    return true
  }
}

/** 记录已看过引导 */
const markTourSeen = () => {
  try {
    localStorage.setItem(TOUR_KEY, 'done')
  } catch {
    // 存储不可用时忽略：下次进入不会再自动弹出（hasSeenTour 返回 true）
  }
}

/**
 * 编辑器使用引导：首次进入自动打开，之后可手动重新打开
 * @returns 是否打开、打开与关闭函数
 */
export const useEditorTour = () => {
  const [open, setOpen] = useState(false)

  // 首次进入：等布局稳定后再打开，保证各引导目标已渲染
  useEffect(() => {
    if (hasSeenTour()) return
    const timer = window.setTimeout(() => setOpen(true), 600)
    return () => window.clearTimeout(timer)
  }, [])

  const start = useCallback(() => setOpen(true), [])
  const close = useCallback(() => {
    setOpen(false)
    markTourSeen()
  }, [])

  return { open, start, close }
}
