import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'

/** 与视口边缘保持的最小留白（px） */
const EDGE_GAP = 16

/** 位移超过该阈值才视为拖动，避免轻微抖动误吞面板点击（px） */
const DRAG_THRESHOLD = 4

/** 调试按钮的悬浮位置（视口坐标，px） */
interface DockPosition {
  /** 距视口左侧距离 */
  x: number
  /** 距视口顶部距离 */
  y: number
}

/** 一次拖拽过程中的临时状态 */
interface DragState {
  pointerId: number
  startX: number
  startY: number
  originX: number
  originY: number
}

/**
 * 把坐标限制在视口内，避免按钮被拖出屏幕后无法再操作。
 * @param value 目标坐标
 * @param size 元素尺寸
 * @param limit 视口尺寸
 * @returns 限制后的坐标
 */
const clampToViewport = (value: number, size: number, limit: number) =>
  Math.min(Math.max(value, EDGE_GAP), Math.max(EDGE_GAP, limit - size - EDGE_GAP))

/**
 * 开发环境调试面板入口：把路由与请求调试按钮合并为一个可拖动的悬浮组。
 * 默认停在右下角，拖动后保持在用户选定的位置；拖动结束不会误打开面板。
 */
export const DevtoolsDock = () => {
  const dockRef = useRef<HTMLDivElement>(null)
  const dragState = useRef<DragState | null>(null)
  const movedRef = useRef(false)
  const [position, setPosition] = useState<DockPosition | null>(null)
  const [dragging, setDragging] = useState(false)

  // 引用保持稳定，避免拖动过程中的重渲染反复触发 devtools 的 setOptions
  const routerToggleButtonProps = useMemo(
    () => ({ style: { position: 'static', cursor: 'grab' } as CSSProperties }),
    [],
  )

  /** 拖动期间在 window 上跟随指针，移到按钮外也不会中断 */
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const state = dragState.current
      if (!state || state.pointerId !== event.pointerId) return

      const dx = event.clientX - state.startX
      const dy = event.clientY - state.startY
      if (!movedRef.current) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
        movedRef.current = true
        setDragging(true)
      }

      const dock = dockRef.current
      setPosition({
        x: clampToViewport(
          Math.round(state.originX + dx),
          dock?.offsetWidth ?? 0,
          window.innerWidth,
        ),
        y: clampToViewport(
          Math.round(state.originY + dy),
          dock?.offsetHeight ?? 0,
          window.innerHeight,
        ),
      })
    }

    // 松手后浏览器还会补发 click，等它被 handleClickCapture 拦下后再复位标记
    const onEnd = (event: PointerEvent) => {
      if (dragState.current?.pointerId !== event.pointerId) return
      dragState.current = null
      setDragging(false)
      if (movedRef.current) {
        window.setTimeout(() => {
          movedRef.current = false
        }, 0)
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onEnd)
    window.addEventListener('pointercancel', onEnd)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onEnd)
      window.removeEventListener('pointercancel', onEnd)
    }
  }, [])

  /**
   * 只记录按下位置，这里不使用 setPointerCapture：
   * 捕获会把 mousedown / mouseup 一并重定向到悬浮组，调试按钮就收不到 click 了。
   */
  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const dock = dockRef.current
    if (!dock) return

    const rect = dock.getBoundingClientRect()
    dragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.left,
      originY: rect.top,
    }
    movedRef.current = false
  }

  /**
   * 拖动后浏览器仍会向按钮派发 click，这里在捕获阶段拦下，
   * 防止松手时把面板一起打开。
   */
  const handleClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!movedRef.current) return
    event.preventDefault()
    event.stopPropagation()
    movedRef.current = false
  }

  const style: CSSProperties = position
    ? { left: position.x, top: position.y }
    : { right: EDGE_GAP, bottom: EDGE_GAP }

  return (
    // h-12 固定高度：面板是 fixed 定位的子孙节点，会把外层量出的高度撑到整块面板高度；
    // [&>div:not([class])] 命中的是路由调试封装自身的占位 div，用 contents 让它不参与尺寸计算
    <div
      ref={dockRef}
      role="toolbar"
      aria-label="开发调试面板"
      className={`fixed z-99999 flex h-12 touch-none items-center gap-2 select-none [&>div:not([class])]:contents ${
        dragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      style={style}
      onPointerDown={handlePointerDown}
      onClickCapture={handleClickCapture}
    >
      <TanStackRouterDevtools toggleButtonProps={routerToggleButtonProps} />
      <ReactQueryDevtools buttonPosition="relative" />
    </div>
  )
}
