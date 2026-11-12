import type { NetworkMesh } from './opendrive/lanes'
import { isOnRoad } from './opendrive/project'
import { findEntityReferences } from './openscenario/edit'
import type { EntityMotion } from './openscenario/motion'
import { segmentSpeeds } from './openscenario/motion'
import type { ResolvedPose } from './openscenario/resolve'
import type { Scenario } from './openscenario/types'

/** 校验结果 */
export interface Issue {
  level: 'error' | 'warning' | 'info'
  message: string
  /** 关联实体，点击时选中 */
  entity?: string
  /** 关联关键帧下标 */
  keyIndex?: number
}

/** 速度上限（m/s，约 216 km/h） */
const MAX_SPEED = 60
/** 车辆离开路面判定的容差：参考点在路面外即提示 */
const ROAD_KINDS = new Set(['vehicle'])

/** 校验输入 */
export interface ValidateInput {
  scenario?: Scenario
  doc?: XMLDocument
  mesh?: NetworkMesh
  poses?: ReadonlyMap<string, ResolvedPose>
  motions?: ReadonlyMap<string, EntityMotion>
}

/**
 * 校验场景：结构、引用、轨迹与物理合理性
 * @param input - 场景、文档与路网
 * @returns 问题列表（按严重程度排序）
 */
export const validateScene = ({ scenario, doc, mesh, poses, motions }: ValidateInput): Issue[] => {
  const issues: Issue[] = []
  if (!mesh) issues.push({ level: 'warning', message: '未加载路网（.xodr），无法校验车道位置' })
  if (!scenario || !doc) {
    issues.push({ level: 'info', message: '未加载场景（.xosc）' })
    return issues
  }
  if (!scenario.logicFile) issues.push({ level: 'error', message: '缺少 RoadNetwork/LogicFile' })

  const names = scenario.entities.map((e) => e.name)
  const seen = new Set<string>()
  for (const n of names) {
    if (seen.has(n)) issues.push({ level: 'error', message: `实体名「${n}」重复`, entity: n })
    seen.add(n)
  }

  // 引用了不存在的实体；参数引用 $xxx 按参数声明的值判断（参数可能在多处声明，任一处为合法实体名即视为有效）
  const known = new Set(names)
  const paramValues = new Map<string, string[]>()
  for (const decl of Array.from(doc.getElementsByTagName('ParameterDeclaration'))) {
    const key = decl.getAttribute('name') ?? ''
    paramValues.set(key, [...(paramValues.get(key) ?? []), decl.getAttribute('value') ?? ''])
  }
  const dangling = new Map<string, number>()
  for (const el of Array.from(doc.getElementsByTagName('*'))) {
    for (const a of Array.from(el.attributes)) {
      if (!/entityref$/i.test(a.name)) continue
      const values = a.value.startsWith('$') ? (paramValues.get(a.value.slice(1)) ?? []) : [a.value]
      // 参数值本身是表达式或未声明时无法判断，跳过
      if (!values.length || values.some((v) => v.startsWith('$') || known.has(v))) continue
      const label = a.value.startsWith('$') ? `${values[0]}（经参数 ${a.value}）` : a.value
      dangling.set(label, (dangling.get(label) ?? 0) + 1)
    }
  }
  for (const [ref, count] of dangling) {
    issues.push({ level: 'error', message: `引用了不存在的实体「${ref}」（${count} 处）` })
  }

  for (const e of scenario.entities) {
    const pose = poses?.get(e.name)
    if (!scenario.initPositions.has(e.name)) {
      issues.push({ level: 'warning', message: `${e.name} 没有初始位置`, entity: e.name })
    } else if (!pose) {
      issues.push({ level: 'warning', message: `${e.name} 的初始位置无法解析`, entity: e.name })
    }
    if (e.length <= 0 || e.width <= 0 || e.height <= 0) {
      issues.push({ level: 'error', message: `${e.name} 的尺寸必须大于 0`, entity: e.name })
    }
    const speed = scenario.initSpeeds.get(e.name)
    if (speed !== undefined && (speed < 0 || speed > MAX_SPEED)) {
      issues.push({
        level: 'warning',
        message: `${e.name} 初始速度 ${speed.toFixed(1)} m/s 超出合理范围`,
        entity: e.name,
      })
    }

    const motion = motions?.get(e.name)
    const keys = motion?.keyframes ?? []
    if (motion?.notice)
      issues.push({ level: 'info', message: `${e.name}：${motion.notice}`, entity: e.name })
    keys.forEach((k, i) => {
      if (k.t < 0)
        issues.push({
          level: 'error',
          message: `${e.name} 第 ${i + 1} 帧时刻为负`,
          entity: e.name,
          keyIndex: i,
        })
      if (i > 0 && k.t <= keys[i - 1].t) {
        issues.push({
          level: 'error',
          message: `${e.name} 第 ${i + 1} 帧时刻未递增`,
          entity: e.name,
          keyIndex: i,
        })
      }
    })
    segmentSpeeds(keys).forEach((seg, i) => {
      if (seg.speed > MAX_SPEED && Number.isFinite(seg.speed)) {
        issues.push({
          level: 'warning',
          message: `${e.name} 第 ${i + 1}→${i + 2} 段速度 ${seg.speed.toFixed(1)} m/s 过快`,
          entity: e.name,
          keyIndex: i + 1,
        })
      }
    })

    if (mesh && ROAD_KINDS.has(e.kind) && e.category !== 'bicycle') {
      const off = keys.length
        ? keys.findIndex((k) => !isOnRoad(mesh, k.x, k.y))
        : pose && !isOnRoad(mesh, pose.x, pose.y)
          ? 0
          : -1
      if (off >= 0) {
        issues.push({
          level: 'warning',
          message:
            keys.length > 1 ? `${e.name} 第 ${off + 1} 帧不在路面上` : `${e.name} 不在路面上`,
          entity: e.name,
          keyIndex: keys.length > 1 ? off : undefined,
        })
      }
    }

    // 实体既有编辑器轨迹又有其他动作时，仿真中可能互相覆盖
    if (motion?.managed) {
      const others = findEntityReferences(doc, e.name).filter(
        (el) =>
          el.tagName === 'EntityRef' &&
          !el.closest('ManeuverGroup')?.getAttribute('name')?.startsWith('WMDG_'),
      ).length
      if (others > 0) {
        issues.push({
          level: 'info',
          message: `${e.name} 还参与 ${others} 个原有动作组，仿真时可能与编辑的轨迹冲突`,
          entity: e.name,
        })
      }
    }
  }

  const order = { error: 0, warning: 1, info: 2 }
  return issues.sort((a, b) => order[a.level] - order[b.level])
}
