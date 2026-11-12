import type { Pose } from '../opendrive/geometry'
import { laneSpansAt, roadToWorld, sectionIndexAt } from '../opendrive/lanes'
import type { Road, RoadNetwork } from '../opendrive/types'
import type { OscOrientation, OscPosition, Scenario } from './types'

/** 已解析到世界坐标的实体位姿，附带道路坐标（若可得）以支持相对道路 / 车道位置 */
export interface ResolvedPose extends Pose {
  road?: { roadId: string; laneId: number; s: number; t: number }
}

/**
 * 在不跨越 0 号车道的前提下平移车道 id
 * @param laneId - 起始车道
 * @param dLane - 平移量（左正右负）
 * @returns 新车道 id
 */
const shiftLane = (laneId: number, dLane: number) => {
  const next = laneId + dLane
  if (laneId < 0 && next >= 0) return next + 1
  if (laneId > 0 && next <= 0) return next - 1
  return next
}

/**
 * 车道是否与参考线反向行驶：右侧通行时左侧车道反向，左侧通行时右侧车道反向
 * @param road - 道路
 * @param laneId - 车道 id
 * @returns 是否反向
 */
const isReversed = (road: Road, laneId: number) => (road.rule === 'LHT' ? laneId < 0 : laneId > 0)

/**
 * 在默认朝向上应用 Orientation
 * @param base - 默认朝向
 * @param o - 朝向设置
 * @returns 最终朝向
 */
const orient = (base: number, o: OscOrientation | undefined) =>
  !o ? base : o.type === 'relative' ? base + o.h : o.h

/**
 * 找到道路坐标 (s, t) 所在的车道
 * @param road - 道路
 * @param s - 参考线 s
 * @param t - 横向坐标
 * @returns 车道 id，不在任何车道内时返回 0
 */
const laneAt = (road: Road, s: number, t: number) => {
  const section = road.laneSections[sectionIndexAt(road, s)]
  if (!section) return 0
  for (const [id, sp] of laneSpansAt(road, section, s)) {
    if (id !== 0 && t >= Math.min(sp.inner, sp.outer) && t <= Math.max(sp.inner, sp.outer))
      return id
  }
  return 0
}

/**
 * 解析单个位置为世界坐标
 * @param pos - 位置
 * @param network - 路网（缺失时只能解析世界坐标与相对实体位置）
 * @param known - 已解析的实体位姿
 * @returns 位姿；引用的实体尚未解析或位置不支持时返回 undefined
 */
export const resolvePosition = (
  pos: OscPosition,
  network: RoadNetwork | undefined,
  known: ReadonlyMap<string, ResolvedPose>,
): ResolvedPose | undefined => {
  const roadOf = (id: string) => network?.roads.find((r) => r.id === id)

  /**
   * 车道坐标 → 世界坐标；朝向默认沿车道行驶方向，reversed 显式给出时以其为准
   */
  const onLane = (
    roadId: string,
    laneId: number,
    s: number,
    offset: number,
    o?: OscOrientation,
    reversed?: boolean,
  ) => {
    const road = roadOf(roadId)
    const section = road?.laneSections[sectionIndexAt(road, s)]
    const span = road && section && laneSpansAt(road, section, s).get(laneId)
    if (!road || !span) return undefined
    const t = (span.inner + span.outer) / 2 + offset
    const p = roadToWorld(road, s, t)
    if (!p) return undefined
    const base = (reversed ?? isReversed(road, laneId)) ? p.hdg + Math.PI : p.hdg
    return { x: p.x, y: p.y, hdg: orient(base, o), road: { roadId, laneId, s, t } }
  }

  /** 道路坐标 → 世界坐标，朝向默认沿参考线方向 */
  const onRoad = (roadId: string, s: number, t: number, o?: OscOrientation) => {
    const road = roadOf(roadId)
    const p = road && roadToWorld(road, s, t)
    if (!road || !p) return undefined
    return {
      x: p.x,
      y: p.y,
      hdg: orient(p.hdg, o),
      road: { roadId, laneId: laneAt(road, s, t), s, t },
    }
  }

  switch (pos.kind) {
    case 'world':
      return { x: pos.x, y: pos.y, hdg: pos.h ?? 0 }
    case 'lane':
      return onLane(pos.roadId, pos.laneId, pos.s, pos.offset, pos.orientation)
    case 'road':
      return onRoad(pos.roadId, pos.s, pos.t, pos.orientation)
    case 'relativeWorld': {
      const ref = known.get(pos.entityRef)
      return ref && { x: ref.x + pos.dx, y: ref.y + pos.dy, hdg: orient(ref.hdg, pos.orientation) }
    }
    case 'relativeObject': {
      const ref = known.get(pos.entityRef)
      if (!ref) return undefined
      const c = Math.cos(ref.hdg)
      const s = Math.sin(ref.hdg)
      return {
        x: ref.x + pos.dx * c - pos.dy * s,
        y: ref.y + pos.dx * s + pos.dy * c,
        hdg: orient(ref.hdg, pos.orientation),
      }
    }
    case 'relativeLane': {
      const refPose = known.get(pos.entityRef)
      const ref = refPose?.road
      const road = ref && roadOf(ref.roadId)
      const roadPose = road && roadToWorld(road, ref.s, ref.t)
      if (!refPose || !ref || !roadPose) return undefined
      // 相对距离沿参考实体的实际行驶方向：实体朝向与参考线反向时 s 递减
      const backwards = Math.cos(refPose.hdg - roadPose.hdg) < 0
      const s = ref.s + (backwards ? -pos.ds : pos.ds)
      return onLane(
        ref.roadId,
        shiftLane(ref.laneId, pos.dLane),
        s,
        pos.offset,
        pos.orientation,
        backwards,
      )
    }
    case 'relativeRoad': {
      const ref = known.get(pos.entityRef)?.road
      return ref && onRoad(ref.roadId, ref.s + pos.ds, ref.t + pos.dt, pos.orientation)
    }
    case 'unsupported':
      return undefined
  }
}

/**
 * 解析场景中所有实体的初始位姿；相对位置按依赖顺序反复迭代
 * @param scenario - 场景
 * @param network - 路网
 * @returns 实体名 → 位姿（无法解析的实体不在结果中）
 */
export const resolveInitPoses = (scenario: Scenario, network: RoadNetwork | undefined) => {
  const known = new Map<string, ResolvedPose>()
  let pending = [...scenario.initPositions]
  for (let round = 0; round < scenario.entities.length + 1 && pending.length; round++) {
    pending = pending.filter(([name, pos]) => {
      const pose = resolvePosition(pos, network, known)
      if (pose) known.set(name, pose)
      return !pose
    })
  }
  return known
}
