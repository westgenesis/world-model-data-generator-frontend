import { Button, Checkbox, Divider, Dropdown, Segmented, Switch, Tooltip } from 'antd'
import { Hand, Layers, Magnet, Maximize, Minus, MousePointer2, Plus, Spline } from 'lucide-react'
import type { CanvasTool, Layers as LayerState } from '../../stores/scene-editor-store'
import { useSceneEditorStore } from '../../stores/scene-editor-store'

/** 图层名称 */
const LAYER_LABELS: Record<keyof LayerState, string> = {
  lanes: '车道',
  marks: '标线',
  entities: '目标物',
  trajectories: '轨迹',
  labels: '名称标签',
  sensors: '自车传感器',
}

interface CanvasToolbarProps {
  onZoom: (factor: number) => void
  onFit: () => void
}

/**
 * 画布工具栏：工具切换、缩放、图层与吸附
 * @param props.onZoom - 以画布中心缩放
 * @param props.onFit - 适应全部内容
 */
export const CanvasToolbar = ({ onZoom, onFit }: CanvasToolbarProps) => {
  const tool = useSceneEditorStore((s) => s.tool)
  const layers = useSceneEditorStore((s) => s.layers)
  const snapToLane = useSceneEditorStore((s) => s.snapToLane)
  const setUi = useSceneEditorStore((s) => s.setUi)
  const toggleLayer = useSceneEditorStore((s) => s.toggleLayer)
  const icon = (Icon: typeof Hand) => <Icon size={15} strokeWidth={1.75} />

  return (
    <div className="pointer-events-auto flex flex-wrap items-center gap-1 rounded-lg border border-line bg-card/95 p-1 shadow-card backdrop-blur">
      <Segmented<CanvasTool>
        size="small"
        value={tool}
        onChange={(v) => setUi({ tool: v })}
        options={[
          {
            value: 'select',
            icon: icon(MousePointer2),
            label: <Tooltip title="选择 / 移动（V）">选择</Tooltip>,
          },
          { value: 'pan', icon: icon(Hand), label: <Tooltip title="平移画布（H）">平移</Tooltip> },
          {
            value: 'draw',
            icon: icon(Spline),
            label: <Tooltip title="为选中目标物逐点绘制轨迹（D）">绘制轨迹</Tooltip>,
          },
        ]}
      />
      <Divider orientation="vertical" className="mx-0.5! h-5!" />
      <Tooltip title="缩小">
        <Button
          type="text"
          size="small"
          aria-label="缩小"
          icon={icon(Minus)}
          onClick={() => onZoom(1 / 1.4)}
        />
      </Tooltip>
      <Tooltip title="放大">
        <Button
          type="text"
          size="small"
          aria-label="放大"
          icon={icon(Plus)}
          onClick={() => onZoom(1.4)}
        />
      </Tooltip>
      <Tooltip title="适应全部（F）">
        <Button
          type="text"
          size="small"
          aria-label="适应全部"
          icon={icon(Maximize)}
          onClick={onFit}
        />
      </Tooltip>
      <Divider orientation="vertical" className="mx-0.5! h-5!" />
      <Dropdown
        trigger={['click']}
        popupRender={() => (
          <div className="flex flex-col gap-1.5 rounded-lg bg-card p-3 shadow-pop">
            {(Object.keys(LAYER_LABELS) as (keyof LayerState)[]).map((k) => (
              <Checkbox key={k} checked={layers[k]} onChange={() => toggleLayer(k)}>
                {LAYER_LABELS[k]}
              </Checkbox>
            ))}
          </div>
        )}
      >
        <Button type="text" size="small" icon={icon(Layers)}>
          图层
        </Button>
      </Dropdown>
      <Tooltip title="放置、拖动目标物与关键帧时吸附到最近车道中心线">
        <label className="flex cursor-pointer items-center gap-1.5 px-1.5 text-xs whitespace-nowrap text-fg-2">
          {icon(Magnet)}
          吸附车道
          <Switch size="small" checked={snapToLane} onChange={(v) => setUi({ snapToLane: v })} />
        </label>
      </Tooltip>
    </div>
  )
}
