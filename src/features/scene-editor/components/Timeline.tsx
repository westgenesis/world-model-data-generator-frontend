import { App, Button, Select, Switch, Tooltip } from 'antd'
import { Pause, Play, SkipBack, StepBack, StepForward } from 'lucide-react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import type { Keyframe } from '../core/openscenario/edit'
import { snapToFrame } from '../core/openscenario/motion'
import { commitKeyframes } from '../hooks/scene-actions'
import { useSceneModel } from '../hooks/use-scene-model'
import { useSceneEditorStore } from '../stores/scene-editor-store'

/** 左侧名称列宽度（px） */
const NAME_COL = 132

/**
 * 选择合适的刻度间隔
 * @param pxPerSec - 每秒像素数
 * @returns 刻度间隔（秒）
 */
const tickStep = (pxPerSec: number) =>
  [0.5, 1, 2, 5, 10, 30, 60].find((s) => s * pxPerSec >= 48) ?? 60

/** 时间轴：播放控制、标尺与各目标物的关键帧 */
export const Timeline = () => {
  const { message } = App.useApp()
  const { scene } = useSceneModel()
  const time = useSceneEditorStore((s) => s.time)
  const playing = useSceneEditorStore((s) => s.playing)
  const rate = useSceneEditorStore((s) => s.rate)
  const fps = useSceneEditorStore((s) => s.fps)
  const duration = useSceneEditorStore((s) => s.duration)
  const autoKey = useSceneEditorStore((s) => s.autoKey)
  const selected = useSceneEditorStore((s) => s.selected)
  const selectedKey = useSceneEditorStore((s) => s.selectedKey)
  const setUi = useSceneEditorStore((s) => s.setUi)
  const select = useSceneEditorStore((s) => s.select)

  const trackRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [drag, setDrag] = useState<{ name: string; index: number; t: number }>()

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const entities = scene?.scenario.entities.filter((e) => e.kind !== 'misc') ?? []
  const lastKeyTime = Math.max(
    0,
    ...entities.flatMap((e) => scene?.motions.get(e.name)?.keyframes.map((k) => k.t) ?? []),
  )
  const span = Math.max(duration, Math.ceil(lastKeyTime + 1))
  const pxPerSec = width > 0 ? width / span : 1
  const step = tickStep(pxPerSec)

  // 播放：按真实时间推进，到结尾循环
  useEffect(() => {
    if (!playing) return
    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      const s = useSceneEditorStore.getState()
      const next = s.time + ((now - last) / 1000) * s.rate
      last = now
      s.setUi({ time: next > span ? 0 : next })
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, span])

  /**
   * 指针位置转时刻（吸附到帧）
   * @param clientX - 指针 x
   * @returns 时刻
   */
  const timeAt = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return 0
    return Math.min(span, snapToFrame((clientX - rect.left) / pxPerSec, fps))
  }

  /** 标尺：按下并拖动移动播放头 */
  const handleRulerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setUi({ time: timeAt(e.clientX), playing: false })
  }

  /** 关键帧菱形：拖动改时刻（首帧固定在 0） */
  const handleKeyDown = (e: ReactPointerEvent, name: string, index: number, t: number) => {
    e.stopPropagation()
    select(name, index)
    setUi({ time: t, playing: false })
    if (index === 0) return
    ;(e.target as Element).setPointerCapture(e.pointerId)
    setDrag({ name, index, t })
  }
  const handleKeyMove = (e: ReactPointerEvent) => {
    if (drag) setDrag({ ...drag, t: timeAt(e.clientX) })
  }
  const handleKeyUp = () => {
    if (!drag) return
    const keys = scene?.motions.get(drag.name)?.keyframes ?? []
    setDrag(undefined)
    if (Math.abs(keys[drag.index].t - drag.t) < 1e-6) return
    if (drag.t <= 0 || keys.some((k, i) => i !== drag.index && Math.abs(k.t - drag.t) < 1e-6)) {
      message.warning('关键帧时刻须大于 0 且不能与其他关键帧重合')
      return
    }
    const next: Keyframe[] = keys.map(({ t, x, y }) => ({ t, x, y }))
    next[drag.index] = { ...next[drag.index], t: drag.t }
    commitKeyframes(drag.name, next, `调整 ${drag.name} 关键帧时刻`)
    setUi({ time: drag.t })
  }

  const ticks = Array.from({ length: Math.floor(span / step) + 1 }, (_, i) => i * step)
  const frameStep = (dir: number) =>
    setUi({ time: Math.min(span, Math.max(0, snapToFrame(time + dir / fps, fps))), playing: false })

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-1.5 border-b border-line px-3 py-1.5">
        <Tooltip title="回到开头">
          <Button
            type="text"
            size="small"
            aria-label="回到开头"
            icon={<SkipBack size={15} strokeWidth={1.75} />}
            onClick={() => setUi({ time: 0 })}
          />
        </Tooltip>
        <Tooltip title="上一帧（←）">
          <Button
            type="text"
            size="small"
            aria-label="上一帧"
            icon={<StepBack size={15} strokeWidth={1.75} />}
            onClick={() => frameStep(-1)}
          />
        </Tooltip>
        <Button
          type="primary"
          size="small"
          icon={playing ? <Pause size={14} strokeWidth={2} /> : <Play size={14} strokeWidth={2} />}
          onClick={() => setUi({ playing: !playing })}
        >
          {playing ? '暂停' : '播放'}
        </Button>
        <Tooltip title="下一帧（→）">
          <Button
            type="text"
            size="small"
            aria-label="下一帧"
            icon={<StepForward size={15} strokeWidth={1.75} />}
            onClick={() => frameStep(1)}
          />
        </Tooltip>
        <span className="ms-1 w-28 font-mono text-xs text-fg-2 tabular-nums">
          t = {time.toFixed(2)} s
        </span>
        <Select
          size="small"
          value={rate}
          onChange={(v) => setUi({ rate: v })}
          options={[0.5, 1, 2, 4].map((v) => ({ value: v, label: `${v}×` }))}
          className="w-18"
        />
        <Select
          size="small"
          value={duration}
          onChange={(v) => setUi({ duration: v })}
          options={[10, 20, 30, 60, 120].map((v) => ({ value: v, label: `${v} s` }))}
          className="w-20"
        />
        <Tooltip title="开启后，在非 0 时刻拖动目标物会在播放头处新增 / 更新关键帧">
          <label className="ms-auto flex cursor-pointer items-center gap-1.5 text-xs whitespace-nowrap text-fg-2">
            自动记帧
            <Switch size="small" checked={autoKey} onChange={(v) => setUi({ autoKey: v })} />
          </label>
        </Tooltip>
      </div>

      <div className="relative flex min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <div
          className="sticky left-0 z-10 shrink-0 border-r border-line bg-card"
          style={{ width: NAME_COL }}
        >
          <div className="h-6 border-b border-line px-3 text-[11px] leading-6 text-fg-3">
            目标物
          </div>
          {entities.map((e) => (
            <button
              key={e.name}
              type="button"
              onClick={() => {
                select(e.name)
                setUi({ canvasFocus: { name: e.name, nonce: Date.now() } })
              }}
              className={`block h-7 w-full cursor-pointer truncate border-b border-line px-3 text-left text-xs transition-colors hover:bg-sunken ${
                e.name === selected ? 'bg-primary-soft font-medium text-primary' : 'text-fg-2'
              }`}
            >
              {e.name}
            </button>
          ))}
        </div>

        <div ref={trackRef} className="relative min-w-0 flex-1 select-none">
          {/* 标尺 */}
          <div
            className="relative h-6 cursor-ew-resize border-b border-line bg-sunken"
            onPointerDown={handleRulerDown}
            onPointerMove={(e) => {
              if (e.buttons === 1) setUi({ time: timeAt(e.clientX) })
            }}
          >
            {ticks.map((t) => (
              <span
                key={t}
                className="absolute top-0 h-full border-l border-line-strong ps-1 text-[10px] leading-6 text-fg-3"
                style={{ left: t * pxPerSec }}
              >
                {t}s
              </span>
            ))}
          </div>

          {/* 各目标物的关键帧 */}
          {entities.map((e) => {
            const keys = scene?.motions.get(e.name)?.keyframes ?? []
            const active = e.name === selected
            return (
              <div
                key={e.name}
                className={`relative h-7 border-b border-line ${active ? 'bg-primary-soft/50' : ''}`}
                onPointerDown={(ev) => {
                  select(e.name)
                  setUi({ time: timeAt(ev.clientX), playing: false })
                }}
              >
                {keys.length >= 2 && (
                  <div
                    className={`absolute top-1/2 h-0.5 -translate-y-1/2 ${active ? 'bg-primary' : 'bg-line-strong'}`}
                    style={{
                      left: keys[0].t * pxPerSec,
                      width: (keys.at(-1)!.t - keys[0].t) * pxPerSec,
                    }}
                  />
                )}
                {keys.length >= 2 &&
                  keys.map((k, i) => {
                    const t = drag && drag.name === e.name && drag.index === i ? drag.t : k.t
                    const on = active && i === selectedKey
                    return (
                      <Tooltip
                        key={i}
                        title={`第 ${i + 1} 帧 · ${t.toFixed(2)} s`}
                        mouseEnterDelay={0.4}
                      >
                        <span
                          role="button"
                          tabIndex={-1}
                          aria-label={`${e.name} 第 ${i + 1} 帧`}
                          className={`absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border transition-transform hover:scale-125 ${
                            on
                              ? 'scale-125 border-danger bg-danger'
                              : active
                                ? 'border-primary bg-card'
                                : 'border-fg-3 bg-card'
                          } ${i === 0 ? 'cursor-pointer' : 'cursor-ew-resize'}`}
                          style={{ left: t * pxPerSec }}
                          onPointerDown={(ev) => handleKeyDown(ev, e.name, i, k.t)}
                          onPointerMove={handleKeyMove}
                          onPointerUp={handleKeyUp}
                        />
                      </Tooltip>
                    )
                  })}
              </div>
            )
          })}

          {entities.length === 0 && <p className="p-3 text-xs text-fg-3">暂无动态目标物</p>}

          {/* 播放头 */}
          <div
            className="pointer-events-none absolute top-0 bottom-0 w-px bg-danger"
            style={{ left: time * pxPerSec }}
          >
            <span className="absolute -top-0.5 -left-1 size-2 rotate-45 bg-danger" />
          </div>
        </div>
      </div>
    </div>
  )
}
