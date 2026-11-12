/**
 * OpenDRIVE（1.4–1.8）只读模型，覆盖平面几何、车道与路口拓扑。
 * 坐标系与规范一致：x 向东、y 向北、hdg 逆时针为正（弧度）、t 沿前进方向左侧为正。
 */

/** 三次多项式 a + b·ds + c·ds² + d·ds³，sOffset 为起点（相对道路或车道段） */
export interface Poly3 {
  sOffset: number
  a: number
  b: number
  c: number
  d: number
}

/** 参考线几何段公共字段 */
interface GeometryBase {
  /** 起点在参考线上的 s 坐标 */
  s: number
  x: number
  y: number
  hdg: number
  length: number
}

/** 平面几何段（planView/geometry 的五种类型） */
export type Geometry =
  | (GeometryBase & { kind: 'line' })
  | (GeometryBase & { kind: 'arc'; curvature: number })
  | (GeometryBase & { kind: 'spiral'; curvStart: number; curvEnd: number })
  | (GeometryBase & { kind: 'poly3'; a: number; b: number; c: number; d: number })
  | (GeometryBase & {
      kind: 'paramPoly3'
      aU: number
      bU: number
      cU: number
      dU: number
      aV: number
      bV: number
      cV: number
      dV: number
      /** arcLength：参数 p ∈ [0, length]；normalized：p ∈ [0, 1] */
      pRange: 'arcLength' | 'normalized'
    })

/** 车道标线 */
export interface RoadMark {
  sOffset: number
  /** solid / broken / solid solid / none 等 */
  type: string
  color: string
  width: number
}

/** 道路 / 车道的前驱或后继 */
export interface LinkRef {
  elementType: 'road' | 'junction'
  elementId: string
  contactPoint?: 'start' | 'end'
}

/** 单条车道 */
export interface Lane {
  id: number
  /** driving / sidewalk / shoulder / border / none 等 */
  type: string
  /** 宽度多项式（sOffset 相对车道段起点）；与 borders 二选一 */
  widths: Poly3[]
  /** 外边界多项式（t 绝对值，sOffset 相对车道段起点） */
  borders: Poly3[]
  roadMarks: RoadMark[]
  predecessor?: number
  successor?: number
}

/** 车道段：在 [s, sEnd) 区间内车道配置不变 */
export interface LaneSection {
  s: number
  sEnd: number
  /** 左侧车道，按 id 升序（1, 2, 3 …，由内向外） */
  left: Lane[]
  center: Lane
  /** 右侧车道，按 id 降序（-1, -2, -3 …，由内向外） */
  right: Lane[]
}

/** 道路 */
export interface Road {
  id: string
  name: string
  length: number
  /** 所属路口 id，普通道路为 '-1' */
  junction: string
  /** 通行规则：右侧通行（RHT，默认）或左侧通行（LHT） */
  rule: 'RHT' | 'LHT'
  predecessor?: LinkRef
  successor?: LinkRef
  /** 按 s 升序 */
  geometries: Geometry[]
  /** 按 sOffset 升序 */
  laneOffsets: Poly3[]
  /** 按 s 升序 */
  laneSections: LaneSection[]
}

/** 路口内车道连接 */
export interface JunctionConnection {
  id: string
  incomingRoad: string
  connectingRoad: string
  contactPoint: 'start' | 'end'
  laneLinks: { from: number; to: number }[]
}

/** 路口 */
export interface Junction {
  id: string
  name: string
  connections: JunctionConnection[]
}

/** 解析中遇到但当前未支持的特性，用于在界面上提示 */
export interface OdrWarning {
  roadId?: string
  message: string
}

/** 路网 */
export interface RoadNetwork {
  /** header 的 revMajor.revMinor，如 "1.6" */
  version: string
  /** geoReference 原文（未做投影换算） */
  geoReference?: string
  roads: Road[]
  junctions: Junction[]
  warnings: OdrWarning[]
}
