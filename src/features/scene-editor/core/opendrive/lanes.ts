import type { Pose } from './geometry'
import { evalPoly3List, evalReferenceLine, findSegment, offsetPose } from './geometry'
import type { Lane, LaneSection, Road, RoadNetwork } from './types'

/** 车道在某个 s 处的横向范围（t 坐标，左正右负） */
export interface LaneSpan {
  /** 靠近参考线一侧的边界 */
  inner: number
  /** 远离参考线一侧的边界 */
  outer: number
}

/** 单条车道的采样结果（坐标为扁平数组 [x0, y0, x1, y1, …]） */
export interface LaneMesh {
  roadId: string
  sectionIndex: number
  laneId: number
  type: string
  /** 是否属于路口内的连接道路 */
  inJunction: boolean
  /** 闭合多边形：内边界正向 + 外边界反向 */
  polygon: number[]
  /** 车道中心线 */
  center: number[]
  /** 中心线各点对应的参考线 s 坐标 */
  stations: number[]
}

/** 车道标线折线 */
export interface MarkLine {
  /** solid / broken / solid solid 等 */
  type: string
  color: string
  width: number
  points: number[]
}

/** 路网采样结果 */
export interface NetworkMesh {
  lanes: LaneMesh[]
  marks: MarkLine[]
  /** 包围盒 [minX, minY, maxX, maxY]；空路网为 undefined */
  bounds?: [number, number, number, number]
}

/**
 * 计算车道段内某条车道在 s 处的宽度或外边界
 * @param lane - 车道
 * @param ds - 相对车道段起点的距离
 * @returns 宽度（widths）或外边界 |t|（borders）
 */
const laneExtent = (lane: Lane, ds: number) =>
  lane.widths.length
    ? { kind: 'width' as const, value: evalPoly3List(lane.widths, ds) }
    : { kind: 'border' as const, value: evalPoly3List(lane.borders, ds) }

/**
 * 计算车道段内所有车道在 s 处的横向范围
 * @param road - 道路
 * @param section - 车道段
 * @param s - 参考线 s 坐标
 * @returns laneId → 横向范围，另含中心车道（id 0）所在 t
 */
export const laneSpansAt = (road: Road, section: LaneSection, s: number): Map<number, LaneSpan> => {
  const base = evalPoly3List(road.laneOffsets, s)
  const ds = s - section.s
  const spans = new Map<number, LaneSpan>([[0, { inner: base, outer: base }]])
  let t = base
  for (const lane of section.left) {
    const e = laneExtent(lane, ds)
    const outer = e.kind === 'width' ? t + e.value : base + e.value
    spans.set(lane.id, { inner: t, outer })
    t = outer
  }
  t = base
  for (const lane of section.right) {
    const e = laneExtent(lane, ds)
    const outer = e.kind === 'width' ? t - e.value : base - e.value
    spans.set(lane.id, { inner: t, outer })
    t = outer
  }
  return spans
}

/**
 * 生成 [s0, s1] 区间的采样站点：均匀步长 + 几何段分界点，保证首尾都在内
 * @param road - 道路
 * @param s0 - 起点
 * @param s1 - 终点
 * @param step - 采样步长（米）
 * @returns 升序站点
 */
export const sampleStations = (road: Road, s0: number, s1: number, step: number): number[] => {
  const set = new Set<number>([s0, s1])
  const n = Math.max(1, Math.ceil((s1 - s0) / step))
  for (let i = 1; i < n; i++) set.add(s0 + ((s1 - s0) * i) / n)
  for (const g of road.geometries) if (g.s > s0 && g.s < s1) set.add(g.s)
  return [...set].sort((a, b) => a - b)
}

/**
 * 计算车道段在 s 处所属的下标
 * @param road - 道路
 * @param s - 参考线 s 坐标
 * @returns 车道段下标
 */
export const sectionIndexAt = (road: Road, s: number) =>
  findSegment(road.laneSections, s, (x) => x.s)

/**
 * 采样单条道路的所有车道与标线
 * @param road - 道路
 * @param step - 采样步长（米）
 * @param out - 输出收集器
 */
const meshRoad = (road: Road, step: number, out: NetworkMesh) => {
  road.laneSections.forEach((section, sectionIndex) => {
    if (section.sEnd <= section.s) return
    const stations = sampleStations(road, section.s, section.sEnd, step)
    const lanes = [...section.left, section.center, ...section.right]
    const inner = new Map<number, number[]>(lanes.map((l) => [l.id, []]))
    const outer = new Map<number, number[]>(lanes.map((l) => [l.id, []]))
    const center = new Map<number, number[]>(lanes.map((l) => [l.id, []]))

    for (const s of stations) {
      const pose = evalReferenceLine(road, s)
      if (!pose) return
      for (const [id, span] of laneSpansAt(road, section, s)) {
        const a = offsetPose(pose, span.inner)
        const b = offsetPose(pose, span.outer)
        const c = offsetPose(pose, (span.inner + span.outer) / 2)
        inner.get(id)?.push(a.x, a.y)
        outer.get(id)?.push(b.x, b.y)
        center.get(id)?.push(c.x, c.y)
      }
    }

    for (const lane of lanes) {
      const o = outer.get(lane.id) ?? []
      if (lane.id !== 0) {
        const i = inner.get(lane.id) ?? []
        const reversed: number[] = []
        for (let k = o.length - 2; k >= 0; k -= 2) reversed.push(o[k], o[k + 1])
        out.lanes.push({
          roadId: road.id,
          sectionIndex,
          laneId: lane.id,
          type: lane.type,
          inJunction: road.junction !== '-1',
          polygon: [...i, ...reversed],
          center: center.get(lane.id) ?? [],
          stations,
        })
      }
      // 标线画在车道外边界上，按 roadMark 的 sOffset 分段
      lane.roadMarks.forEach((mark, mi) => {
        if (mark.type === 'none') return
        const from = section.s + mark.sOffset
        const to = section.s + (lane.roadMarks[mi + 1]?.sOffset ?? Infinity)
        const points: number[] = []
        stations.forEach((s, k) => {
          if (s >= from - 1e-9 && s <= to + 1e-9) points.push(o[k * 2], o[k * 2 + 1])
        })
        if (points.length >= 4) {
          out.marks.push({ type: mark.type, color: mark.color, width: mark.width, points })
        }
      })
    }
  })
}

/**
 * 采样整张路网，生成渲染用的车道多边形与标线
 * @param network - 路网
 * @param step - 采样步长（米），默认 0.5
 * @returns 采样结果
 */
export const buildNetworkMesh = (network: RoadNetwork, step = 0.5): NetworkMesh => {
  const out: NetworkMesh = { lanes: [], marks: [] }
  for (const road of network.roads) meshRoad(road, step, out)

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const lane of out.lanes) {
    for (let k = 0; k < lane.polygon.length; k += 2) {
      minX = Math.min(minX, lane.polygon[k])
      maxX = Math.max(maxX, lane.polygon[k])
      minY = Math.min(minY, lane.polygon[k + 1])
      maxY = Math.max(maxY, lane.polygon[k + 1])
    }
  }
  if (Number.isFinite(minX)) out.bounds = [minX, minY, maxX, maxY]
  return out
}

/**
 * 道路坐标 (s, t) 转世界坐标
 * @param road - 道路
 * @param s - 参考线 s 坐标
 * @param t - 横向偏移，左正右负
 * @returns 位姿（朝向为参考线方向）；道路无几何时返回 undefined
 */
export const roadToWorld = (road: Road, s: number, t: number): Pose | undefined => {
  const pose = evalReferenceLine(road, s)
  return pose && offsetPose(pose, t)
}

/**
 * 车道坐标转世界坐标：车道中心 + offset
 * @param road - 道路
 * @param laneId - 车道 id
 * @param s - 参考线 s 坐标
 * @param offset - 相对车道中心的横向偏移，左正右负
 * @returns 位姿（朝向为参考线方向）；车道不存在时返回 undefined
 */
export const laneToWorld = (
  road: Road,
  laneId: number,
  s: number,
  offset = 0,
): Pose | undefined => {
  const section = road.laneSections[sectionIndexAt(road, s)]
  const span = section && laneSpansAt(road, section, s).get(laneId)
  if (!span) return undefined
  return roadToWorld(road, s, (span.inner + span.outer) / 2 + offset)
}
