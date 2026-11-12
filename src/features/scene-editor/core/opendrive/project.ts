import type { LaneMesh, NetworkMesh } from './lanes'
import type { RoadNetwork } from './types'

/** 投影结果：最近车道中心线上的点 */
export interface LaneProjection {
  roadId: string
  laneId: number
  /** 参考线 s 坐标（在相邻采样点之间线性插值） */
  s: number
  /** 车道中心线上的最近点 */
  x: number
  y: number
  /** 车道行驶方向（弧度） */
  hdg: number
  /** 查询点到最近点的距离（米） */
  distance: number
}

/** 可通行（适合放置车辆）的车道类型 */
const DRIVABLE = new Set([
  'driving',
  'entry',
  'exit',
  'onRamp',
  'offRamp',
  'connectingRamp',
  'bidirectional',
])

/**
 * 将世界坐标投影到最近的车道中心线
 * @param mesh - 路网采样结果
 * @param network - 路网（用于判断左右通行）
 * @param x - 世界坐标 x
 * @param y - 世界坐标 y
 * @param filter - 车道筛选；默认只考虑可通行车道
 * @returns 投影结果；没有候选车道时返回 undefined
 */
export const projectToLane = (
  mesh: NetworkMesh,
  network: RoadNetwork,
  x: number,
  y: number,
  filter: (lane: LaneMesh) => boolean = (l) => DRIVABLE.has(l.type),
): LaneProjection | undefined => {
  let best: LaneProjection | undefined
  for (const lane of mesh.lanes) {
    if (!filter(lane)) continue
    const c = lane.center
    for (let i = 0; i + 3 < c.length; i += 2) {
      const ax = c[i]
      const ay = c[i + 1]
      const dx = c[i + 2] - ax
      const dy = c[i + 3] - ay
      const len2 = dx * dx + dy * dy
      const r = len2 > 0 ? Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / len2)) : 0
      const px = ax + dx * r
      const py = ay + dy * r
      const d = Math.hypot(x - px, y - py)
      if (best && d >= best.distance) continue
      const k = i / 2
      const s0 = lane.stations[k] ?? 0
      const s1 = lane.stations[k + 1] ?? s0
      const road = network.roads.find((rd) => rd.id === lane.roadId)
      const reversed = road?.rule === 'LHT' ? lane.laneId < 0 : lane.laneId > 0
      const hdg = Math.atan2(dy, dx) + (reversed ? Math.PI : 0)
      best = {
        roadId: lane.roadId,
        laneId: lane.laneId,
        s: s0 + (s1 - s0) * r,
        x: px,
        y: py,
        hdg,
        distance: d,
      }
    }
  }
  return best
}

/**
 * 判断点是否落在任一车道多边形内（射线法）
 * @param mesh - 路网采样结果
 * @param x - 世界坐标 x
 * @param y - 世界坐标 y
 * @returns 是否在路面上
 */
export const isOnRoad = (mesh: NetworkMesh, x: number, y: number): boolean =>
  mesh.lanes.some((lane) => {
    const p = lane.polygon
    let inside = false
    for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
      const xi = p[i]
      const yi = p[i + 1]
      const xj = p[j]
      const yj = p[j + 1]
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
    }
    return inside
  })
