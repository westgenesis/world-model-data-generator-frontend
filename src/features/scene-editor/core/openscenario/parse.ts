import { child, children } from '../xml'
import type { ParamTable } from './expression'
import { paramNum, paramStr, readParams } from './expression'
import { EDITOR_STORY } from './types'
import type {
  EntityKind,
  OscEntity,
  OscPosition,
  OscTrajectory,
  OscWarning,
  Scenario,
} from './types'

/** OpenSCENARIO 格式错误 */
export class OpenScenarioError extends Error {
  override name = 'OpenScenarioError'
}

/** 目录引用未加载目录文件时的默认尺寸（长、宽、高、包围盒中心纵向偏移） */
const DEFAULT_SIZE: Record<string, [number, number, number, number]> = {
  car: [4.5, 1.8, 1.5, 1.4],
  van: [5.2, 2.0, 2.0, 1.6],
  truck: [8.0, 2.5, 3.4, 2.5],
  semitrailer: [12.0, 2.5, 3.8, 4.0],
  bus: [12.0, 2.5, 3.2, 4.0],
  bicycle: [1.8, 0.6, 1.7, 0.5],
  motorbike: [2.0, 0.8, 1.5, 0.6],
  pedestrian: [0.5, 0.6, 1.8, 0],
  misc: [1.0, 1.0, 1.0, 0],
}

/** 目录条目名关键字 → 类别 */
const CATEGORY_HINTS: [string, string][] = [
  ['truck', 'truck'],
  ['trailer', 'semitrailer'],
  ['bus', 'bus'],
  ['bicycle', 'bicycle'],
  ['bike', 'bicycle'],
  ['van', 'van'],
]

/**
 * 按元素向上收集作用域内的参数声明（外层先、内层后覆盖）
 * @param el - 起始元素
 * @param global - 顶层参数表
 * @param cache - 元素 → 参数表缓存
 * @returns 参数表
 */
const scopeParams = (el: Element, global: ParamTable, cache: Map<Element, ParamTable>) => {
  const chain: Element[] = []
  for (let cur: Element | null = el; cur && cur !== el.ownerDocument.documentElement;) {
    chain.unshift(cur)
    cur = cur.parentElement
  }
  let table = global
  for (const node of chain) {
    const cached = cache.get(node)
    if (cached) {
      table = cached
      continue
    }
    const decls = child(node, 'ParameterDeclarations')
    if (decls) table = readParams(decls, table)
    cache.set(node, table)
  }
  return table
}

/**
 * 读取位置元素
 * @param posEl - Position 元素
 * @param params - 参数表
 * @returns 位置
 */
const readPosition = (posEl: Element | undefined, params: ParamTable): OscPosition => {
  const el = posEl?.firstElementChild ?? undefined
  const n = (name: string, fallback = 0) => paramNum(el, name, params, fallback)
  const str = (name: string) => paramStr(el, name, params)
  const o = child(el, 'Orientation')
  const orientation = o
    ? {
        type:
          paramStr(o, 'type', params) === 'relative'
            ? ('relative' as const)
            : ('absolute' as const),
        h: paramNum(o, 'h', params),
      }
    : undefined
  switch (el?.tagName) {
    case 'WorldPosition':
      return { kind: 'world', x: n('x'), y: n('y'), h: el.hasAttribute('h') ? n('h') : undefined }
    case 'LanePosition':
      return {
        kind: 'lane',
        roadId: str('roadId'),
        laneId: n('laneId'),
        s: n('s'),
        offset: n('offset'),
        orientation,
      }
    case 'RoadPosition':
      return { kind: 'road', roadId: str('roadId'), s: n('s'), t: n('t'), orientation }
    case 'RelativeObjectPosition':
      return {
        kind: 'relativeObject',
        entityRef: str('entityRef'),
        dx: n('dx'),
        dy: n('dy'),
        orientation,
      }
    case 'RelativeWorldPosition':
      return {
        kind: 'relativeWorld',
        entityRef: str('entityRef'),
        dx: n('dx'),
        dy: n('dy'),
        orientation,
      }
    case 'RelativeLanePosition':
      return {
        kind: 'relativeLane',
        entityRef: str('entityRef'),
        dLane: n('dLane'),
        ds: el.hasAttribute('ds') ? n('ds') : n('dsLane'),
        offset: n('offset'),
        orientation,
      }
    case 'RelativeRoadPosition':
      return {
        kind: 'relativeRoad',
        entityRef: str('entityRef'),
        ds: n('ds'),
        dt: n('dt'),
        orientation,
      }
    default:
      return { kind: 'unsupported', tag: el?.tagName ?? '空' }
  }
}

/**
 * 读取实体
 * @param so - ScenarioObject 元素
 * @param params - 参数表
 * @returns 实体
 */
const readEntity = (so: Element, params: ParamTable): OscEntity => {
  const name = so.getAttribute('name') ?? ''
  const def = so.firstElementChild ?? undefined
  const sized = (kind: EntityKind, category: string): OscEntity => {
    const [length, width, height, centerX] =
      DEFAULT_SIZE[category] ?? DEFAULT_SIZE[kind === 'vehicle' ? 'car' : kind]
    return { name, kind, category, length, width, height, centerX }
  }

  if (def?.tagName === 'CatalogReference') {
    const catalogName = paramStr(def, 'catalogName', params)
    const entryName = paramStr(def, 'entryName', params)
    const lower = `${catalogName} ${entryName}`.toLowerCase()
    const kind: EntityKind = lower.includes('pedestrian')
      ? 'pedestrian'
      : lower.includes('misc') || lower.includes('object')
        ? 'misc'
        : 'vehicle'
    // 目录未加载时按条目名猜测类别，仅用于选默认尺寸
    const entry = entryName.toLowerCase()
    const guessed = CATEGORY_HINTS.find(([hint]) => entry.includes(hint))?.[1]
    return {
      ...sized(kind, guessed ?? (kind === 'vehicle' ? 'car' : kind)),
      catalog: { catalogName, entryName },
    }
  }

  const kind: EntityKind =
    def?.tagName === 'Pedestrian'
      ? 'pedestrian'
      : def?.tagName === 'MiscObject'
        ? 'misc'
        : 'vehicle'
  const category =
    paramStr(
      def,
      kind === 'vehicle'
        ? 'vehicleCategory'
        : kind === 'pedestrian'
          ? 'pedestrianCategory'
          : 'miscObjectCategory',
      params,
    ) || kind
  const bb = child(def, 'BoundingBox')
  if (!bb) return sized(kind, category)
  const dim = child(bb, 'Dimensions')
  const center = child(bb, 'Center')
  return {
    name,
    kind,
    category,
    length: paramNum(dim, 'length', params, 1),
    width: paramNum(dim, 'width', params, 1),
    height: paramNum(dim, 'height', params, 1),
    centerX: paramNum(center, 'x', params),
  }
}

/**
 * 读取场景中所有折线轨迹，并通过所在 ManeuverGroup 找到执行实体
 * @param root - 根元素
 * @param global - 顶层参数表
 * @param cache - 参数作用域缓存
 * @param warnings - 告警收集器
 * @returns 轨迹列表
 */
const readTrajectories = (
  root: Element,
  global: ParamTable,
  cache: Map<Element, ParamTable>,
  warnings: OscWarning[],
): OscTrajectory[] => {
  const result: OscTrajectory[] = []
  Array.from(root.getElementsByTagName('Trajectory')).forEach((traj, index) => {
    const params = scopeParams(traj, global, cache)
    const shape = child(traj, 'Shape')?.firstElementChild
    const name = traj.getAttribute('name') ?? ''
    if (shape?.tagName !== 'Polyline') {
      warnings.push({ message: `轨迹「${name}」的 ${shape?.tagName ?? '空'} 形状暂未支持显示` })
      return
    }
    const group = traj.closest('ManeuverGroup') ?? undefined
    const actors = children(child(group, 'Actors'), 'EntityRef').map((r) =>
      paramStr(r, 'entityRef', scopeParams(r, global, cache)),
    )
    const timing = child(child(traj.closest('FollowTrajectoryAction'), 'TimeReference'), 'Timing')
    const timeConds = Array.from(
      traj.closest('Event')?.querySelectorAll(':scope > StartTrigger SimulationTimeCondition') ??
        [],
    )
    const anyCondition = traj.closest('Event')?.querySelector(':scope > StartTrigger Condition')
    result.push({
      name,
      index,
      managed: traj.closest('Story')?.getAttribute('name') === EDITOR_STORY,
      actors,
      absoluteTiming: timing?.getAttribute('domainAbsoluteRelative') === 'absolute',
      startsAtZero:
        !anyCondition ||
        (timeConds.length > 0 &&
          timeConds.every((c) => paramNum(c, 'value', scopeParams(c, global, cache)) <= 0)),
      vertices: children(shape, 'Vertex').map((v) => ({
        time: v.hasAttribute('time') ? paramNum(v, 'time', params) : undefined,
        position: readPosition(child(v, 'Position'), params),
      })),
    })
  })
  return result
}

/**
 * 将 OpenSCENARIO DOM 解析为只读场景模型
 * @param doc - XML 文档
 * @returns 场景
 * @throws {OpenScenarioError} 根节点不是 OpenSCENARIO 时抛出
 */
export const parseOpenScenario = (doc: XMLDocument): Scenario => {
  const root = doc.documentElement
  if (root.tagName !== 'OpenSCENARIO') {
    throw new OpenScenarioError(`根节点应为 <OpenSCENARIO>，实际为 <${root.tagName}>`)
  }
  const warnings: OscWarning[] = []
  const header = child(root, 'FileHeader')
  const global = readParams(child(root, 'ParameterDeclarations'))
  const cache = new Map<Element, ParamTable>()

  if (child(root, 'ParameterValueDistribution') || child(root, 'Catalog')) {
    warnings.push({ message: '该文件是参数分布或目录文件，不是可运行场景' })
  }

  const entities = children(child(root, 'Entities'), 'ScenarioObject').map((so) =>
    readEntity(so, global),
  )
  if (children(child(root, 'Entities'), 'EntitySelection').length) {
    warnings.push({ message: 'EntitySelection 暂未支持' })
  }

  const initPositions = new Map<string, OscPosition>()
  const initSpeeds = new Map<string, number>()
  const init = child(child(root, 'Storyboard'), 'Init')
  for (const priv of children(child(init, 'Actions'), 'Private')) {
    const params = scopeParams(priv, global, cache)
    const entity = paramStr(priv, 'entityRef', params)
    for (const action of children(priv, 'PrivateAction')) {
      const teleport = child(action, 'TeleportAction')
      if (teleport) {
        const pos = readPosition(child(teleport, 'Position'), params)
        if (pos.kind === 'unsupported') {
          warnings.push({ entity, message: `初始位置 ${pos.tag} 暂未支持` })
        }
        initPositions.set(entity, pos)
      }
      const target = child(
        child(child(child(action, 'LongitudinalAction'), 'SpeedAction'), 'SpeedActionTarget'),
        'AbsoluteTargetSpeed',
      )
      if (target) initSpeeds.set(entity, paramNum(target, 'value', params))
    }
  }

  return {
    version: `${header?.getAttribute('revMajor') ?? '1'}.${header?.getAttribute('revMinor') ?? '?'}`,
    description: header?.getAttribute('description') ?? '',
    logicFile:
      child(child(root, 'RoadNetwork'), 'LogicFile')?.getAttribute('filepath') ?? undefined,
    entities,
    initPositions,
    initSpeeds,
    trajectories: readTrajectories(root, global, cache, warnings),
    warnings,
  }
}
