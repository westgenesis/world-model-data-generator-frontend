import type { Pose } from '../opendrive/geometry'
import type { RoadNetwork } from '../opendrive/types'
import type { Keyframe } from './edit'
import { withHeadings } from './edit'
import type { ResolvedPose } from './resolve'
import { resolvePosition } from './resolve'
import type { Scenario } from './types'

/** 实体运动：关键帧及其来源 */
export interface EntityMotion {
  /** 来源轨迹在文档中的序号；编辑器尚未创建轨迹时为 undefined */
  trajectoryIndex?: number
  /** 轨迹是否由编辑器管理 */
  managed: boolean
  /** 按时刻排序、带朝向的关键帧（世界坐标） */
  keyframes: Required<Keyframe>[]
  /** 提示：导入轨迹的时间语义与编辑器不完全一致时说明原因 */
  notice?: string
}

/**
 * 为每个实体提取关键帧。
 * 优先使用编辑器管理的轨迹，其次使用只属于该实体的导入折线轨迹；都没有时只有初始位置一帧。
 * @param scenario - 场景
 * @param network - 路网（用于解析车道坐标顶点）
 * @param initPoses - 已解析的初始位姿
 * @returns 实体名 → 运动
 */
export const buildMotions = (
  scenario: Scenario,
  network: RoadNetwork | undefined,
  initPoses: ReadonlyMap<string, ResolvedPose>,
): Map<string, EntityMotion> => {
  const result = new Map<string, EntityMotion>()
  for (const entity of scenario.entities) {
    const own = scenario.trajectories.filter(
      (t) => t.actors.length === 1 && t.actors[0] === entity.name,
    )
    const traj = own.find((t) => t.managed) ?? own[0]
    const init = initPoses.get(entity.name)

    if (!traj) {
      result.set(entity.name, {
        managed: false,
        keyframes: init ? [{ t: 0, x: init.x, y: init.y, h: init.hdg }] : [],
      })
      continue
    }

    const notices: string[] = []
    if (!traj.startsAtZero) notices.push('该轨迹由条件触发，回放时按仿真开始计时')
    if (!traj.absoluteTiming && !traj.managed)
      notices.push('顶点时刻为相对时间，回放时按绝对时间处理')
    const untimed = traj.vertices.some((v) => v.time === undefined)
    if (untimed) notices.push('部分顶点没有时刻，已按 5 m/s 估算')

    let lastT = 0
    let prev: Pose | undefined
    const points: Keyframe[] = []
    for (const v of traj.vertices) {
      const p = resolvePosition(v.position, network, initPoses)
      if (!p) continue
      const dist = prev ? Math.hypot(p.x - prev.x, p.y - prev.y) : 0
      const t = v.time ?? (prev ? lastT + dist / 5 : 0)
      points.push({ t, x: p.x, y: p.y })
      prev = p
      lastT = t
    }
    if (points.length < traj.vertices.length) notices.push('部分顶点的位置无法解析，已跳过')

    result.set(entity.name, {
      trajectoryIndex: traj.index,
      managed: traj.managed,
      keyframes: withHeadings(
        points.sort((a, b) => a.t - b.t),
        init?.hdg ?? 0,
      ),
      notice: notices.join('；') || undefined,
    })
  }
  return result
}

/**
 * 按时刻对关键帧线性插值（OpenSCENARIO Polyline 语义）。首帧之前、末帧之后保持不动
 * @param keyframes - 已排序、带朝向的关键帧
 * @param t - 时刻（秒）
 * @returns 位姿；没有关键帧时返回 undefined
 */
export const poseAt = (keyframes: Required<Keyframe>[], t: number): Pose | undefined => {
  if (!keyframes.length) return undefined
  const first = keyframes[0]
  const last = keyframes[keyframes.length - 1]
  if (t <= first.t) return { x: first.x, y: first.y, hdg: first.h }
  if (t >= last.t) return { x: last.x, y: last.y, hdg: last.h }
  let i = 0
  while (i < keyframes.length - 2 && keyframes[i + 1].t <= t) i++
  const a = keyframes[i]
  const b = keyframes[i + 1]
  const r = b.t > a.t ? (t - a.t) / (b.t - a.t) : 1
  return { x: a.x + (b.x - a.x) * r, y: a.y + (b.y - a.y) * r, hdg: a.h }
}

/** 段速度 */
export interface SegmentSpeed {
  /** 平均速度（m/s）；时长为 0 时为 Infinity */
  speed: number
  /** 与上一段相比变化超过 15% */
  jump: boolean
}

/**
 * 计算各段平均速度，并标记速度突变
 * @param keyframes - 已排序的关键帧
 * @returns 第 i 项对应第 i → i+1 段
 */
export const segmentSpeeds = (keyframes: Keyframe[]): SegmentSpeed[] => {
  const result: SegmentSpeed[] = []
  for (let i = 0; i < keyframes.length - 1; i++) {
    const a = keyframes[i]
    const b = keyframes[i + 1]
    const dt = b.t - a.t
    const speed = dt > 0 ? Math.hypot(b.x - a.x, b.y - a.y) / dt : Infinity
    const prev = result[i - 1]?.speed
    const jump =
      prev !== undefined &&
      Number.isFinite(prev) &&
      Number.isFinite(speed) &&
      Math.abs(speed - prev) > Math.max(prev, speed, 0.5) * 0.15
    result.push({ speed, jump })
  }
  return result
}

/**
 * 把时刻吸附到帧
 * @param t - 时刻（秒）
 * @param fps - 帧率
 * @returns 吸附后的时刻
 */
export const snapToFrame = (t: number, fps: number) => Math.max(0, Math.round(t * fps) / fps)
