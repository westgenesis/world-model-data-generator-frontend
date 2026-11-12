import { memo } from 'react'
import { Line } from 'react-konva'
import type { LaneMesh, NetworkMesh } from '../../core/opendrive/lanes'
import type { CanvasColors } from './palette'
import { laneFill } from './palette'

/**
 * 车道面。大地图有上千条车道，用 memo 避免播放、拖动等高频重渲染时重建节点
 * @param props.mesh - 路网网格
 * @param props.colors - 画布配色
 * @param props.onHover - 鼠标进入 / 离开车道（需为稳定引用）
 */
export const LaneShapes = memo(function LaneShapes({
  mesh,
  colors,
  onHover,
}: {
  mesh: NetworkMesh
  colors: CanvasColors
  onHover: (lane: LaneMesh | undefined) => void
}) {
  return mesh.lanes.map((lane) => (
    <Line
      key={`${lane.roadId}/${lane.sectionIndex}/${lane.laneId}`}
      points={lane.polygon}
      closed
      fill={laneFill(lane, colors)}
      perfectDrawEnabled={false}
      shadowForStrokeEnabled={false}
      onMouseEnter={() => onHover(lane)}
      onMouseLeave={() => onHover(undefined)}
    />
  ))
})

/**
 * 车道标线（同样 memo，理由同上）
 * @param props.mesh - 路网网格
 * @param props.colors - 画布配色
 */
export const LaneMarks = memo(function LaneMarks({
  mesh,
  colors,
}: {
  mesh: NetworkMesh
  colors: CanvasColors
}) {
  return mesh.marks.map((m, i) => (
    <Line
      key={i}
      points={m.points}
      stroke={m.color === 'yellow' ? colors.yellow : colors.white}
      strokeWidth={Math.max(m.width, 0.1)}
      dash={m.type.includes('broken') ? [3, 6] : undefined}
      listening={false}
      perfectDrawEnabled={false}
    />
  ))
})
