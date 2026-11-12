import { App, Button, Tooltip } from 'antd'
import { Plus, Trash2 } from 'lucide-react'
import type { Keyframe } from '../../core/openscenario/edit'
import type { EntityMotion } from '../../core/openscenario/motion'
import { poseAt, segmentSpeeds, snapToFrame } from '../../core/openscenario/motion'
import { commitKeyframes, deleteKeyframe } from '../../hooks/scene-actions'
import { useSceneEditorStore } from '../../stores/scene-editor-store'
import { NumberField } from './fields'

interface KeyframeTableProps {
  name: string
  motion: EntityMotion
}

const CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳'

/**
 * 关键帧表：时刻 / X / Y 可直接编辑，段速度突变高亮
 * @param props.name - 实体名
 * @param props.motion - 实体运动
 */
export const KeyframeTable = ({ name, motion }: KeyframeTableProps) => {
  const { message } = App.useApp()
  const selectedKey = useSceneEditorStore((s) => s.selectedKey)
  const time = useSceneEditorStore((s) => s.time)
  const fps = useSceneEditorStore((s) => s.fps)
  const select = useSceneEditorStore((s) => s.select)
  const setUi = useSceneEditorStore((s) => s.setUi)
  const keys = motion.keyframes
  const speeds = segmentSpeeds(keys)

  /** 改一个关键帧的某个字段 */
  const update = (index: number, patch: Partial<Keyframe>) => {
    const next: Keyframe[] = keys.map(({ t, x, y }) => ({ t, x, y }))
    next[index] = { ...next[index], ...patch }
    if (
      patch.t !== undefined &&
      next.some((k, i) => i !== index && Math.abs(k.t - patch.t!) < 1e-6)
    ) {
      message.warning('该时刻已有关键帧')
      return
    }
    commitKeyframes(name, next, `修改 ${name} 关键帧`)
  }

  /** 在播放头处按当前插值位置记录关键帧 */
  const recordAtPlayhead = () => {
    const t = snapToFrame(time, fps)
    if (keys.some((k) => Math.abs(k.t - t) < 1e-6)) {
      message.info(`t=${t.toFixed(2)}s 已有关键帧`)
      return
    }
    const pose = poseAt(keys, t) ?? keys[0]
    if (!pose) return
    const next: Keyframe[] = [
      ...keys.map(({ t: kt, x, y }) => ({ t: kt, x, y })),
      { t, x: pose.x, y: pose.y },
    ]
    commitKeyframes(name, next, `${name} 记录关键帧`)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-lg border border-line">
        <table className="w-full text-xs">
          <thead className="bg-sunken text-fg-3">
            <tr>
              <th className="w-7 py-1.5 font-normal">#</th>
              <th className="py-1.5 font-normal">时刻 s</th>
              <th className="py-1.5 font-normal">X m</th>
              <th className="py-1.5 font-normal">Y m</th>
              <th className="w-14 py-1.5 font-normal">段速度</th>
              <th className="w-7" />
            </tr>
          </thead>
          <tbody>
            {keys.map((k, i) => {
              const seg = speeds[i - 1]
              const active = i === selectedKey
              return (
                <tr
                  key={i}
                  className={`cursor-pointer border-t border-line transition-colors ${active ? 'bg-primary-soft' : 'hover:bg-sunken'}`}
                  onClick={() => {
                    select(name, i)
                    setUi({ time: k.t })
                  }}
                >
                  <td className={`text-center ${active ? 'text-primary' : 'text-fg-3'}`}>
                    {CIRCLED[i] ?? i + 1}
                  </td>
                  <td className="p-0.5">
                    <NumberField
                      value={k.t}
                      step={1 / fps}
                      min={0}
                      disabled={i === 0}
                      onCommit={(t) => update(i, { t: snapToFrame(t, fps) })}
                    />
                  </td>
                  <td className="p-0.5">
                    <NumberField value={k.x} onCommit={(x) => update(i, { x })} />
                  </td>
                  <td className="p-0.5">
                    <NumberField value={k.y} onCommit={(y) => update(i, { y })} />
                  </td>
                  <td
                    className={`text-center tabular-nums ${seg?.jump ? 'font-medium text-warning' : 'text-fg-2'}`}
                  >
                    <Tooltip
                      title={seg?.jump ? '与上一段速度相差超过 15%，可能导致加速度突变' : undefined}
                    >
                      <span>
                        {seg ? (Number.isFinite(seg.speed) ? seg.speed.toFixed(1) : '∞') : '—'}
                      </span>
                    </Tooltip>
                  </td>
                  <td>
                    {i > 0 && (
                      <Tooltip title="删除关键帧">
                        <Button
                          type="text"
                          size="small"
                          aria-label="删除关键帧"
                          icon={<Trash2 size={13} strokeWidth={1.75} />}
                          onClick={(e) => {
                            e.stopPropagation()
                            try {
                              deleteKeyframe(name, i)
                            } catch (err) {
                              message.warning(err instanceof Error ? err.message : String(err))
                            }
                          }}
                        />
                      </Tooltip>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <Button size="small" icon={<Plus size={14} strokeWidth={1.75} />} onClick={recordAtPlayhead}>
        在 t={snapToFrame(time, fps).toFixed(1)}s 记录关键帧
      </Button>
    </div>
  )
}
