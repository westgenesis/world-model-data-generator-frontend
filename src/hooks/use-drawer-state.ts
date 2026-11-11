import { useCallback, useState } from 'react'

/** 抽屉 / 弹窗的开关状态及当前操作的记录 */
export interface DrawerState<T> {
  open: boolean
  /** 当前操作的记录；新建场景为 undefined */
  record?: T
  /**
   * 打开抽屉
   * @param record - 要操作的记录，新建时不传
   */
  show: (record?: T) => void
  /** 关闭抽屉（保留 record，避免关闭动画期间内容闪变） */
  close: () => void
}

/**
 * 管理抽屉的开关与当前记录，统一新建 / 编辑等场景的状态写法
 * @returns 抽屉状态
 */
export const useDrawerState = <T = undefined>(): DrawerState<T> => {
  const [state, setState] = useState<{ open: boolean; record?: T }>({ open: false })
  const show = useCallback((record?: T) => setState({ open: true, record }), [])
  const close = useCallback(() => setState((prev) => ({ ...prev, open: false })), [])
  return { ...state, show, close }
}
