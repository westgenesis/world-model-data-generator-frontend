/**
 * OpenSCENARIO 1.x 只读模型（技术验证范围）：实体、初始位置、初始速度与折线轨迹。
 * 其余故事板内容保留在 DOM 中，导出时原样写回。
 */

/**
 * 朝向：absolute 为世界坐标系绝对朝向；
 * relative 叠加在默认朝向上（车道位置为车道行驶方向，道路位置为参考线方向，相对实体位置为参考实体朝向）
 */
export interface OscOrientation {
  type: 'absolute' | 'relative'
  h: number
}

/** 位置（已解析参数与表达式） */
export type OscPosition =
  | { kind: 'world'; x: number; y: number; h?: number }
  | {
      kind: 'lane'
      roadId: string
      laneId: number
      s: number
      offset: number
      orientation?: OscOrientation
    }
  | { kind: 'road'; roadId: string; s: number; t: number; orientation?: OscOrientation }
  | {
      kind: 'relativeObject'
      entityRef: string
      dx: number
      dy: number
      orientation?: OscOrientation
    }
  | {
      kind: 'relativeWorld'
      entityRef: string
      dx: number
      dy: number
      orientation?: OscOrientation
    }
  | {
      kind: 'relativeLane'
      entityRef: string
      dLane: number
      ds: number
      offset: number
      orientation?: OscOrientation
    }
  | {
      kind: 'relativeRoad'
      entityRef: string
      ds: number
      dt: number
      orientation?: OscOrientation
    }
  /** 未支持的位置类型，保留标签名用于提示 */
  | { kind: 'unsupported'; tag: string }

/** 实体类别 */
export type EntityKind = 'vehicle' | 'pedestrian' | 'misc'

/** 场景实体 */
export interface OscEntity {
  name: string
  kind: EntityKind
  /** 车辆类别（car / truck / bicycle …）或行人类别 */
  category: string
  /** 包围盒尺寸（米）；目录引用未加载目录文件时使用默认值 */
  length: number
  width: number
  height: number
  /** 包围盒中心相对参考点（后轴中心）的纵向偏移 */
  centerX: number
  /** 来自目录引用时的目录名与条目名 */
  catalog?: { catalogName: string; entryName: string }
}

/** 编辑器管理的 Story 名称：其下的轨迹由编辑器生成，可放心整体改写 */
export const EDITOR_STORY = 'WMDG_EditorStory'

/** 折线轨迹 */
export interface OscTrajectory {
  name: string
  /** 在文档全部 <Trajectory> 中的序号，用于定位回 DOM */
  index: number
  /** 是否位于编辑器管理的 Story 中 */
  managed: boolean
  /** 使用该轨迹的实体（来自所在 ManeuverGroup 的 Actors） */
  actors: string[]
  /** 顶点时刻是否为仿真绝对时间（Timing domainAbsoluteRelative="absolute"） */
  absoluteTiming: boolean
  /** 所在事件是否在仿真开始时触发（无触发条件或 SimulationTimeCondition ≤ 0） */
  startsAtZero: boolean
  vertices: { time?: number; position: OscPosition }[]
}

/** 解析中遇到但当前未支持的内容 */
export interface OscWarning {
  entity?: string
  message: string
}

/** 场景 */
export interface Scenario {
  version: string
  description: string
  /** RoadNetwork/LogicFile 的路径（相对 xosc 文件） */
  logicFile?: string
  entities: OscEntity[]
  /** 实体名 → 初始位置 */
  initPositions: Map<string, OscPosition>
  /** 实体名 → 初始速度（m/s） */
  initSpeeds: Map<string, number>
  trajectories: OscTrajectory[]
  warnings: OscWarning[]
}
