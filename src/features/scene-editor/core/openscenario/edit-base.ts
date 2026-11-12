/**
 * OpenSCENARIO 编辑的公共部分：类型、元素查询、初始位置写入与编辑器管理元素的查找。
 */
import type { ElSpec } from '../dom'
import { build, cloneDoc, ensureChild, insertPretty, removePretty, replacePretty } from '../dom'
import type { EntityKind } from './types'
import { EDITOR_STORY } from './types'

/** 关键帧：绝对时刻（秒）与世界坐标位姿 */
export interface Keyframe {
  t: number
  x: number
  y: number
  /** 朝向（弧度）；省略时按轨迹方向自动计算 */
  h?: number
}

/** 新建 / 修改实体时的定义 */
export interface EntityDraft {
  name: string
  kind: EntityKind
  /** vehicleCategory / pedestrianCategory / miscObjectCategory 的取值 */
  category: string
  length: number
  width: number
  height: number
}

/** 初始位置 */
export type InitPose =
  | { kind: 'world'; x: number; y: number; h: number }
  | { kind: 'lane'; roadId: string; laneId: number; s: number; offset: number }

/** 编辑器管理的元素名前缀 */
export const PREFIX = 'WMDG_'

/** 文件元素查询 */
export const rootOf = (doc: XMLDocument) => doc.documentElement

export const childOf = (el: Element | undefined | null, tag: string) =>
  el ? (Array.from(el.children).find((c) => c.tagName === tag) ?? undefined) : undefined

export const childrenOf = (el: Element | undefined | null, tag: string) =>
  el ? Array.from(el.children).filter((c) => c.tagName === tag) : []

/**
 * 场景文件的次版本号（决定 1.0 / 1.1+ 的结构差异）
 * @param doc - 文档
 * @returns revMinor
 */
export const revMinor = (doc: XMLDocument) =>
  Number(childOf(rootOf(doc), 'FileHeader')?.getAttribute('revMinor') ?? '1') || 0

/**
 * 查找实体定义
 * @param doc - 文档
 * @param name - 实体名
 * @returns ScenarioObject 元素
 */
export const findObject = (doc: XMLDocument, name: string) =>
  childrenOf(childOf(rootOf(doc), 'Entities'), 'ScenarioObject').find(
    (so) => so.getAttribute('name') === name,
  )

/**
 * 获取 Init/Actions 元素（不存在时创建）
 * @param doc - 文档
 * @returns Actions 元素
 */
const initActions = (doc: XMLDocument) => {
  const root = rootOf(doc)
  const storyboard = ensureChild(root, 'Storyboard')
  const init = ensureChild(storyboard, 'Init', storyboard.firstElementChild)
  return ensureChild(init, 'Actions')
}

/**
 * 查找或创建实体在 Init 中的 Private
 * @param doc - 文档
 * @param name - 实体名
 * @param create - 不存在时是否创建
 * @returns Private 元素
 */
export const initPrivate = (doc: XMLDocument, name: string, create: boolean) => {
  const actions = initActions(doc)
  const found = childrenOf(actions, 'Private').find((p) => p.getAttribute('entityRef') === name)
  if (found || !create) return found
  return insertPretty(actions, build(doc, ['Private', { entityRef: name }]))
}

/**
 * 位置元素描述
 * @param pose - 位置
 * @returns Position 元素描述
 */
const positionSpec = (pose: InitPose): ElSpec =>
  pose.kind === 'world'
    ? ['Position', {}, [['WorldPosition', { x: pose.x, y: pose.y, z: 0, h: pose.h }]]]
    : [
        'Position',
        {},
        [
          [
            'LanePosition',
            { roadId: pose.roadId, laneId: pose.laneId, offset: pose.offset, s: pose.s },
          ],
        ],
      ]

/**
 * 设置初始位置（TeleportAction）
 * @param doc - 原文档
 * @param name - 实体名
 * @param pose - 位置
 * @param clone - 是否先克隆（内部链式调用时传 false）
 * @returns 新文档
 */
export const setInitPose = (
  doc: XMLDocument,
  name: string,
  pose: InitPose,
  clone = true,
): XMLDocument => {
  const next = clone ? cloneDoc(doc) : doc
  const priv = initPrivate(next, name, true) as Element
  const position = build(next, positionSpec(pose))
  const teleport = childrenOf(priv, 'PrivateAction')
    .map((pa) => childOf(pa, 'TeleportAction'))
    .find(Boolean)
  if (teleport) {
    const old = childOf(teleport, 'Position')
    if (old) replacePretty(old, position)
    else insertPretty(teleport, position)
  } else {
    insertPretty(
      priv,
      build(next, ['PrivateAction', {}, [['TeleportAction', {}, [positionSpec(pose)]]]]),
      priv.firstElementChild,
    )
  }
  return next
}

/**
 * 编辑器管理的 ManeuverGroup
 * @param doc - 文档
 * @param name - 实体名
 * @returns 元素
 */
export const managedGroup = (doc: XMLDocument, name: string) =>
  Array.from(doc.getElementsByTagName('ManeuverGroup')).find(
    (g) =>
      g.getAttribute('name') === `${PREFIX}${name}` &&
      g.closest('Story')?.getAttribute('name') === EDITOR_STORY,
  )

/**
 * 删除已经空了的编辑器 Story
 * @param doc - 文档
 */
export const cleanupEditorStory = (doc: XMLDocument) => {
  const story = Array.from(doc.getElementsByTagName('Story')).find(
    (s) => s.getAttribute('name') === EDITOR_STORY,
  )
  if (story && !story.getElementsByTagName('ManeuverGroup').length) removePretty(story)
}
