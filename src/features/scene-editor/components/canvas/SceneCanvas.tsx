import { App } from 'antd'
import type Konva from 'konva'
import type { DragEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Circle, Group, Label, Layer, Line, Rect, Stage, Tag, Text } from 'react-konva'
import { useIsDark } from '@/hooks/use-is-dark'
import { ELEMENT_DRAG_TYPE, UPGRADE_NOTICE } from '../../constants/elements'
import type { LaneMesh } from '../../core/opendrive/lanes'
import type { Keyframe } from '../../core/openscenario/edit'
import {
  addElementById,
  appendKeyframe,
  commitKeyframes,
  moveEntity,
  snapPoint,
} from '../../hooks/scene-actions'
import { useEntityPoses } from '../../hooks/use-entity-poses'
import { useSceneModel } from '../../hooks/use-scene-model'
import { useSceneEditorStore } from '../../stores/scene-editor-store'
import { CanvasToolbar } from './CanvasToolbar'
import { SensorCoverage, SensorMounts } from './EgoSensors'
import { isGroundEntity } from './entity-variant'
import { LaneMarks, LaneShapes } from './RoadLayer'
import { EntityShape } from './EntityShape'
import { CANVAS_PALETTE } from './palette'

/** 画布视图：屏幕坐标 = 偏移 + 世界坐标 × 缩放（y 轴翻转） */
interface View {
  x: number
  y: number
  scale: number
}

type Bounds = [number, number, number, number]

/**
 * 计算让包围盒铺满画布的视图
 * @param bounds - 世界坐标包围盒
 * @param width - 画布宽
 * @param height - 画布高
 * @returns 视图
 */
const fitView = ([minX, minY, maxX, maxY]: Bounds, width: number, height: number): View => {
  const scale = Math.min(width / Math.max(maxX - minX, 1), height / Math.max(maxY - minY, 1)) * 0.9
  return {
    scale,
    x: width / 2 - ((minX + maxX) / 2) * scale,
    y: height / 2 + ((minY + maxY) / 2) * scale,
  }
}

interface SceneCanvasProps {
  /** 文件被拖到画布上时 */
  onDropFiles: (files: File[]) => void
}

/**
 * 场景画布：路网、目标物、轨迹与关键帧；支持拖动编辑、绘制轨迹、拖入元件
 * @param props.onDropFiles - 文件拖入回调
 */
export const SceneCanvas = ({ onDropFiles }: SceneCanvasProps) => {
  const { message } = App.useApp()
  const colors = CANVAS_PALETTE[useIsDark() ? 'dark' : 'light']
  const { road, scene } = useSceneModel()
  const poses = useEntityPoses(scene)
  const tool = useSceneEditorStore((s) => s.tool)
  const layers = useSceneEditorStore((s) => s.layers)
  const sensorConfig = useSceneEditorStore((s) => s.sensors?.config)
  const selectedSensor = useSceneEditorStore((s) => s.selectedSensor)
  const selected = useSceneEditorStore((s) => s.selected)
  const selectedKey = useSceneEditorStore((s) => s.selectedKey)
  const select = useSceneEditorStore((s) => s.select)
  const setUi = useSceneEditorStore((s) => s.setUi)

  const containerRef = useRef<HTMLDivElement>(null)
  const statusRef = useRef<HTMLSpanElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [view, setView] = useState<View>({ x: 0, y: 0, scale: 4 })
  const [hovered, setHovered] = useState<LaneMesh>()

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height }),
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  /** 内容包围盒：优先路网，否则用实体位置 */
  const contentBounds = useCallback((): Bounds | undefined => {
    if (road?.mesh.bounds) return road.mesh.bounds
    const pts = [...poses.values()]
    if (!pts.length) return undefined
    const xs = pts.map((p) => p.x)
    const ys = pts.map((p) => p.y)
    return [Math.min(...xs) - 30, Math.min(...ys) - 30, Math.max(...xs) + 30, Math.max(...ys) + 30]
  }, [road, poses])

  const fit = useCallback(() => {
    const bounds = contentBounds()
    if (bounds && size.width > 0) setView(fitView(bounds, size.width, size.height))
  }, [contentBounds, size])

  // 路网变化（或首次有内容）时自动适配视图
  const fitKey = road ?? (scene ? 'scene' : undefined)
  const [fittedFor, setFittedFor] = useState<unknown>()
  if (fitKey && size.width > 0 && fittedFor !== fitKey) {
    const bounds = contentBounds()
    if (bounds) {
      setFittedFor(fitKey)
      setView(fitView(bounds, size.width, size.height))
    }
  }

  // 外部请求：适应全部（快捷键 F）
  const fitRequest = useSceneEditorStore((s) => s.fitRequest)
  const [handledFit, setHandledFit] = useState(fitRequest)
  if (fitRequest !== handledFit && size.width > 0) {
    setHandledFit(fitRequest)
    const bounds = contentBounds()
    if (bounds) setView(fitView(bounds, size.width, size.height))
  }

  // 外部请求：平移到实体（在列表中选中时），实体已在视野内则不动
  const canvasFocus = useSceneEditorStore((s) => s.canvasFocus)
  const [handledFocus, setHandledFocus] = useState(canvasFocus)
  if (canvasFocus !== handledFocus && size.width > 0) {
    setHandledFocus(canvasFocus)
    const pose = canvasFocus && poses.get(canvasFocus.name)
    if (pose) {
      const sx = view.x + pose.x * view.scale
      const sy = view.y - pose.y * view.scale
      const margin = 60
      if (sx < margin || sx > size.width - margin || sy < margin || sy > size.height - margin) {
        setView({
          ...view,
          x: size.width / 2 - pose.x * view.scale,
          y: size.height / 2 + pose.y * view.scale,
        })
      }
    }
  }

  // 视野中心同步到 store，供单击元件时放置
  useEffect(() => {
    if (size.width === 0) return
    setUi({
      viewCenter: {
        x: (size.width / 2 - view.x) / view.scale,
        y: (view.y - size.height / 2) / view.scale,
      },
    })
  }, [view, size, setUi])

  /**
   * 屏幕坐标转世界坐标
   * @param px - 相对画布左上角的 x
   * @param py - 相对画布左上角的 y
   * @returns 世界坐标
   */
  const toWorld = useCallback(
    (px: number, py: number) => ({ x: (px - view.x) / view.scale, y: (view.y - py) / view.scale }),
    [view],
  )
  const toScreen = (x: number, y: number) => ({
    x: view.x + x * view.scale,
    y: view.y - y * view.scale,
  })

  /** 以某个屏幕点为中心缩放 */
  const zoomAt = useCallback((factor: number, px: number, py: number) => {
    setView((v) => {
      const scale = Math.min(Math.max(v.scale * factor, 0.02), 400)
      const wx = (px - v.x) / v.scale
      const wy = (v.y - py) / v.scale
      return { scale, x: px - wx * scale, y: py + wy * scale }
    })
  }, [])

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const pointer = e.target.getStage()?.getPointerPosition()
    if (pointer) zoomAt(Math.exp(-e.evt.deltaY * 0.0015), pointer.x, pointer.y)
  }

  /** 鼠标位置的世界坐标与车道信息写到状态栏（直接改 DOM，避免整画布重渲染） */
  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const pointer = e.target.getStage()?.getPointerPosition()
    if (!pointer || !statusRef.current) return
    const w = toWorld(pointer.x, pointer.y)
    statusRef.current.textContent = `x ${w.x.toFixed(2)}  y ${w.y.toFixed(2)}`
  }

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.button !== 0) return
    const stage = e.target.getStage()
    const pointer = stage?.getPointerPosition()
    if (!pointer) return
    if (tool === 'draw') {
      if (!selected) {
        message.info('先选中一个目标物，再在画布上逐点绘制轨迹')
        return
      }
      const entity = scene?.scenario.entities.find((x) => x.name === selected)
      if (entity?.kind === 'misc') {
        message.info('静态障碍物不能设置轨迹')
        return
      }
      const w = toWorld(pointer.x, pointer.y)
      appendKeyframe(selected, w.x, w.y, useSceneEditorStore.getState().drawSpeed)
      return
    }
    // 点击空白处取消选中（点到车道也视为空白）
    const onEntity = e.target.findAncestor?.('.entity', true)
    if (!onEntity && e.target.name() !== 'keyframe') select(undefined)
  }

  // 拖入元件或文件
  const handleDragOver = (e: DragEvent) => {
    const types = Array.from(e.dataTransfer.types)
    if (types.includes(ELEMENT_DRAG_TYPE) || types.includes('Files')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    }
  }
  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    const id = e.dataTransfer.getData(ELEMENT_DRAG_TYPE)
    if (id) {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const w = toWorld(e.clientX - rect.left, e.clientY - rect.top)
      try {
        const result = addElementById(id, w.x, w.y)
        if (result?.upgraded) message.info(UPGRADE_NOTICE)
        if (result?.autoEgo) {
          message.info(`已将「${result.name}」设为自车，可在「自车」页签更换并配置传感器`)
        }
        setUi({ inspectorTab: 'entity' })
      } catch (err) {
        message.error(err instanceof Error ? err.message : String(err))
      }
      return
    }
    const files = Array.from(e.dataTransfer.files)
    if (files.length) onDropFiles(files)
  }

  const entities = scene?.scenario.entities ?? []
  // 贴地的标记（人行横道、停车位等）先画，车辆和行人画在上面；sort 为稳定排序，其余保持原顺序
  const drawOrder = useMemo(
    () =>
      [...(scene?.scenario.entities ?? [])].sort(
        (a, b) => Number(isGroundEntity(b)) - Number(isGroundEntity(a)),
      ),
    [scene],
  )
  const selectedMotion = selected ? scene?.motions.get(selected) : undefined
  // 自车与选中传感器的覆盖范围（多辆车标记为自车时不显示，由校验面板提示）
  const egos = entities.filter((e) => e.ego)
  const egoPose = egos.length === 1 ? poses.get(egos[0].name) : undefined
  const coverage = sensorConfig?.sensors.find((s) => s.id === selectedSensor)
  const px = 1 / view.scale

  /** 关键帧手柄拖动结束：更新该关键帧 */
  const handleKeyDragEnd = (index: number, node: Konva.Node) => {
    if (!selected || !selectedMotion) return
    const keys: Keyframe[] = selectedMotion.keyframes.map(({ t, x, y }) => ({ t, x, y }))
    const hit = snapPoint(node.x(), node.y())
    keys[index] = { ...keys[index], x: hit?.x ?? node.x(), y: hit?.y ?? node.y() }
    node.position({ x: selectedMotion.keyframes[index].x, y: selectedMotion.keyframes[index].y })
    commitKeyframes(selected, keys, `移动 ${selected} 关键帧`)
    select(selected, index)
  }

  return (
    <div
      ref={containerRef}
      className={`relative size-full overflow-hidden bg-[#eef1f5] dark:bg-[#0b0f17] ${
        tool === 'draw' ? 'cursor-crosshair' : tool === 'pan' ? 'cursor-grab' : ''
      }`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {size.width > 0 && (
        <Stage
          width={size.width}
          height={size.height}
          draggable
          onWheel={handleWheel}
          onMouseMove={handleMouseMove}
          onClick={handleStageClick}
          onDragEnd={(e) => {
            const stage = e.target
            if (stage !== stage.getStage()) return
            // 先读出拖动位移再归零：setView 的更新函数可能延后执行，届时 stage 已被归零，读到的位移会是 0，
            // 导致视图弹回原位
            const dx = stage.x()
            const dy = stage.y()
            stage.position({ x: 0, y: 0 })
            setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }))
          }}
        >
          <Layer>
            <Group x={view.x} y={view.y} scaleX={view.scale} scaleY={-view.scale}>
              {layers.lanes && road && (
                <LaneShapes mesh={road.mesh} colors={colors} onHover={setHovered} />
              )}
              {layers.lanes && hovered && (
                <Line
                  points={hovered.polygon}
                  closed
                  stroke={colors.hover}
                  strokeWidth={1.5}
                  strokeScaleEnabled={false}
                  listening={false}
                />
              )}
              {layers.marks && road && <LaneMarks mesh={road.mesh} colors={colors} />}

              {layers.trajectories &&
                entities.map((e) => {
                  const keys = scene?.motions.get(e.name)?.keyframes ?? []
                  if (keys.length < 2) return null
                  const active = e.name === selected
                  return (
                    <Line
                      key={`traj-${e.name}`}
                      points={keys.flatMap((k) => [k.x, k.y])}
                      stroke={active ? colors.trajectory : colors.trajectoryMuted}
                      strokeWidth={active ? 2 : 1.5}
                      strokeScaleEnabled={false}
                      dash={[8 * px, 5 * px]}
                      listening={false}
                    />
                  )
                })}

              {layers.sensors && egoPose && coverage && (
                <Group
                  x={egoPose.x}
                  y={egoPose.y}
                  rotation={(egoPose.hdg * 180) / Math.PI}
                  listening={false}
                >
                  <SensorCoverage sensor={coverage} colors={colors} px={px} />
                </Group>
              )}

              {layers.entities &&
                drawOrder.map((e) => {
                  const pose = poses.get(e.name)
                  if (!pose) return null
                  const active = e.name === selected
                  return (
                    <Group
                      key={e.name}
                      name="entity"
                      x={pose.x}
                      y={pose.y}
                      rotation={(pose.hdg * 180) / Math.PI}
                      draggable={tool === 'select'}
                      onMouseDown={() => {
                        if (tool === 'select') select(e.name)
                      }}
                      onClick={() => {
                        if (tool !== 'draw') select(e.name)
                        setUi({ inspectorTab: 'entity' })
                      }}
                      onDragStart={() => select(e.name)}
                      onDragEnd={(ev) => {
                        const node = ev.target
                        const { x, y } = node.position()
                        node.position({ x: pose.x, y: pose.y })
                        moveEntity(e.name, x, y)
                      }}
                    >
                      {/* 放大点击区域，避免小目标难以选中 */}
                      <Rect
                        x={e.centerX - Math.max(e.length, 12 * px) / 2}
                        y={-Math.max(e.width, 12 * px) / 2}
                        width={Math.max(e.length, 12 * px)}
                        height={Math.max(e.width, 12 * px)}
                        fill="transparent"
                      />
                      <EntityShape entity={e} colors={colors} active={active} px={px} />
                      {e.ego && layers.sensors && sensorConfig && (
                        <SensorMounts
                          sensors={sensorConfig.sensors}
                          colors={colors}
                          px={px}
                          selected={selectedSensor}
                        />
                      )}
                    </Group>
                  )
                })}

              {layers.trajectories &&
                selected &&
                selectedMotion &&
                selectedMotion.keyframes.length >= 2 &&
                selectedMotion.keyframes.map((k, i) => (
                  <Circle
                    key={`key-${i}`}
                    name="keyframe"
                    x={k.x}
                    y={k.y}
                    radius={(i === selectedKey ? 6 : 4.5) * px}
                    fill={i === selectedKey ? colors.selected : colors.keyframe}
                    stroke={colors.trajectory}
                    strokeWidth={2}
                    strokeScaleEnabled={false}
                    hitStrokeWidth={10}
                    draggable={tool !== 'pan'}
                    onClick={() => {
                      select(selected, i)
                      setUi({ time: k.t })
                    }}
                    onDragStart={() => select(selected, i)}
                    onDragEnd={(ev) => handleKeyDragEnd(i, ev.target)}
                  />
                ))}
            </Group>
          </Layer>

          <Layer listening={false}>
            {layers.labels &&
              layers.entities &&
              entities.map((e) => {
                const pose = poses.get(e.name)
                if (!pose) return null
                const p = toScreen(pose.x, pose.y)
                return (
                  <Label key={e.name} x={p.x + 10} y={p.y - 26}>
                    <Tag fill={colors.labelBg} cornerRadius={4} />
                    <Text
                      text={e.name}
                      fontSize={11}
                      fontStyle={e.name === selected ? 'bold' : 'normal'}
                      fill={e.name === selected ? colors.selected : colors.label}
                      padding={3}
                    />
                  </Label>
                )
              })}
            {selected &&
              selectedMotion &&
              selectedMotion.keyframes.length >= 2 &&
              selectedMotion.keyframes.map((k, i) => {
                const p = toScreen(k.x, k.y)
                return (
                  <Text
                    key={`kt-${i}`}
                    x={p.x + 7}
                    y={p.y + 6}
                    text={`${k.t.toFixed(1)}s`}
                    fontSize={10}
                    fill={i === selectedKey ? colors.selected : colors.label}
                  />
                )
              })}
          </Layer>
        </Stage>
      )}

      <div className="pointer-events-none absolute top-3 left-3">
        <CanvasToolbar onZoom={(f) => zoomAt(f, size.width / 2, size.height / 2)} onFit={fit} />
      </div>

      <div className="pointer-events-none absolute bottom-2 left-3 flex items-center gap-3 rounded-md bg-card/85 px-2 py-1 font-mono text-[11px] text-fg-2 shadow-card backdrop-blur">
        <span ref={statusRef}>x — y —</span>
        {hovered && (
          <span>
            道路 {hovered.roadId} · 车道 {hovered.laneId} · {hovered.type}
          </span>
        )}
        {tool === 'draw' && <span className="text-primary">单击逐点追加关键帧</span>}
      </div>
    </div>
  )
}
