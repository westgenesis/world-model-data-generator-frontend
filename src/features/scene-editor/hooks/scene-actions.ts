/**
 * 场景编辑动作：把界面操作翻译成 core/openscenario/edit 的纯函数调用并提交到 store。
 * 读取当前状态用 getState，可在事件处理函数中直接调用。
 */
import { projectToLane } from '../core/opendrive/project'
import type { EntityDraft, InitPose, Keyframe } from '../core/openscenario/edit'
import {
  addEntity,
  catalogToInline,
  createEmptyScenario,
  removeEntity,
  renameEntity,
  revMinor,
  setEntityProps,
  setInitPose,
  setInitSpeed,
  setKeyframes,
  setLogicFile,
  setStopTime,
  uniqueName,
} from '../core/openscenario/edit'
import { snapToFrame } from '../core/openscenario/motion'
import type { OscEntity } from '../core/openscenario/types'
import type { SceneElement } from '../constants/elements'
import { SCENE_ELEMENTS } from '../constants/elements'
import { useSceneEditorStore } from '../stores/scene-editor-store'
import { getSceneModel } from './use-scene-model'

/** 同一位置判定为同一关键帧的时间窗（秒） */
const SAME_KEY_WINDOW = 0.15

const store = () => useSceneEditorStore.getState()

/**
 * 当前场景文档；没有时先新建一个引用当前路网的空场景
 * @returns 文档
 */
const ensureScene = (): XMLDocument => {
  const s = store()
  if (s.xosc) return s.xosc.doc
  const source = createEmptyScenario({ logicFile: s.xodr ? s.xodrName : 'road.xodr' })
  s.load('xosc', source, 'scene.xosc')
  return source.doc
}

/**
 * 吸附到车道（开启吸附且有路网时）
 * @param x - 世界坐标 x
 * @param y - 世界坐标 y
 * @returns 吸附结果；未吸附时返回 undefined
 */
export const snapPoint = (x: number, y: number) => {
  const { snapToLane } = store()
  const { road } = getSceneModel()
  if (!snapToLane || !road) return undefined
  const hit = projectToLane(road.mesh, road.network, x, y)
  // 离车道太远时不吸附，允许放在路外
  return hit && hit.distance < 6 ? hit : undefined
}

/**
 * 查找实体与其运动
 * @param name - 实体名
 * @returns 实体、运动与初始位姿
 */
const entityInfo = (name: string) => {
  const { scene } = getSceneModel()
  return {
    entity: scene?.scenario.entities.find((e) => e.name === name),
    motion: scene?.motions.get(name),
    init: scene?.poses.get(name),
  }
}

/**
 * 在指定位置添加元件库中的目标物
 * @param element - 元件
 * @param x - 世界坐标 x
 * @param y - 世界坐标 y
 * @returns 新实体名，以及场景是否因角色属性升级到 OpenSCENARIO 1.2
 */
export const addElementAt = (
  element: SceneElement,
  x: number,
  y: number,
): { name: string; upgraded: boolean } => {
  const doc = ensureScene()
  const { scene } = getSceneModel()
  const name = uniqueName(scene?.scenario.entities.map((e) => e.name) ?? [], element.prefix)
  const draft: EntityDraft = {
    name,
    kind: element.kind,
    category: element.category,
    length: element.length,
    width: element.width,
    height: element.height,
    role: element.role,
    maxSpeed: element.maxSpeed,
  }
  const hit = snapPoint(x, y)
  // 不吸附时，朝向取附近车道的行驶方向，避免新车横在路上
  const { road } = getSceneModel()
  const near = !hit && road ? projectToLane(road.mesh, road.network, x, y) : undefined
  const pose: InitPose = hit
    ? { kind: 'lane', roadId: hit.roadId, laneId: hit.laneId, s: hit.s, offset: 0 }
    : { kind: 'world', x, y, h: near && near.distance < 30 ? near.hdg : 0 }
  const next = addEntity(doc, draft, pose)
  const upgraded = revMinor(next) > revMinor(doc)
  store().commit(
    'xosc',
    next,
    upgraded ? `添加 ${name}（升级为 OpenSCENARIO 1.2）` : `添加 ${name}`,
  )
  store().select(name)
  return { name, upgraded }
}

/**
 * 按元件 id 添加（用于拖拽数据）
 * @param id - 元件 id
 * @param x - 世界坐标 x
 * @param y - 世界坐标 y
 * @returns 同 addElementAt；元件不存在时返回 undefined
 */
export const addElementById = (id: string, x: number, y: number) => {
  const element = SCENE_ELEMENTS.find((e) => e.id === id)
  return element ? addElementAt(element, x, y) : undefined
}

/**
 * 写入关键帧并提交
 * @param name - 实体名
 * @param keyframes - 关键帧
 * @param label - 历史记录名
 */
export const commitKeyframes = (name: string, keyframes: Keyframe[], label: string) => {
  const { xosc } = store()
  const { motion, init } = entityInfo(name)
  if (!xosc) return
  const sorted = [...keyframes].sort((a, b) => a.t - b.t)
  const first = sorted[0]
  // 首帧位置未变时不改写初始位置，保留原有的 LanePosition 等写法
  const syncInit =
    !!first && (!init || Math.hypot(first.x - init.x, first.y - init.y) > 1e-3 || first.t !== 0)
  const doc = setKeyframes(xosc.doc, name, sorted, {
    trajectoryIndex: motion?.managed ? undefined : motion?.trajectoryIndex,
    syncInit,
  })
  store().commit('xosc', doc, label)
}

/**
 * 移动实体（画布拖动松手时调用）。规则：
 * - 选中了关键帧：改该关键帧
 * - 有轨迹且开启自动记帧：在播放头处新增或更新关键帧
 * - 没有轨迹、动态实体、播放头不在 0 且开启自动记帧：以初始位置为首帧，新增一帧形成轨迹
 * - 其他情况：修改初始位置
 * @param name - 实体名
 * @param x - 世界坐标 x
 * @param y - 世界坐标 y
 */
export const moveEntity = (name: string, x: number, y: number) => {
  const { xosc, time, autoKey, selectedKey, fps } = store()
  const { entity, motion, init } = entityInfo(name)
  if (!xosc || !entity) return
  const hit = snapPoint(x, y)
  const px = hit?.x ?? x
  const py = hit?.y ?? y
  const keys = motion?.keyframes ?? []
  const t = snapToFrame(time, fps)

  if (
    keys.length >= 2 ||
    (keys.length === 1 && selectedKey === undefined && autoKey && t > 0 && entity.kind !== 'misc')
  ) {
    const next: Keyframe[] = keys.map(({ t: kt, x: kx, y: ky }) => ({ t: kt, x: kx, y: ky }))
    const index =
      selectedKey !== undefined && keys[selectedKey]
        ? selectedKey
        : next.findIndex((k) => Math.abs(k.t - t) <= SAME_KEY_WINDOW)
    if (index >= 0) next[index] = { ...next[index], x: px, y: py }
    else if (autoKey) next.push({ t, x: px, y: py })
    else next[0] = { ...next[0], x: px, y: py }
    commitKeyframes(name, next, `移动 ${name}`)
    return
  }

  const pose: InitPose = hit
    ? { kind: 'lane', roadId: hit.roadId, laneId: hit.laneId, s: hit.s, offset: 0 }
    : { kind: 'world', x: px, y: py, h: init?.hdg ?? 0 }
  store().commit('xosc', setInitPose(xosc.doc, name, pose), `移动 ${name}`)
}

/**
 * 绘制轨迹：追加一个关键帧，时刻 = 上一帧时刻 + 距离 / 速度
 * @param name - 实体名
 * @param x - 世界坐标 x
 * @param y - 世界坐标 y
 * @param speed - 速度（m/s）
 */
export const appendKeyframe = (name: string, x: number, y: number, speed: number) => {
  const { motion, init } = entityInfo(name)
  const { fps } = store()
  const hit = snapPoint(x, y)
  const px = hit?.x ?? x
  const py = hit?.y ?? y
  const keys: Keyframe[] = (motion?.keyframes ?? []).map(({ t, x: kx, y: ky }) => ({
    t,
    x: kx,
    y: ky,
  }))
  if (!keys.length && init) keys.push({ t: 0, x: init.x, y: init.y })
  const last = keys.at(-1)
  const dist = last ? Math.hypot(px - last.x, py - last.y) : 0
  // 点在上一帧附近（例如点到了目标物自身）时忽略，避免生成重合的关键帧
  if (last && dist < 0.5) return
  const t = last ? snapToFrame(last.t + Math.max(dist / Math.max(speed, 0.1), 1 / fps), fps) : 0
  keys.push({ t, x: px, y: py })
  commitKeyframes(name, keys, `绘制 ${name} 轨迹`)
  store().setUi({ time: t })
}

/**
 * 删除关键帧。首帧即初始位置，不可删除；
 * 编辑器生成的轨迹只剩首帧时整条删除，导入的轨迹至少保留两点
 * @param name - 实体名
 * @param index - 关键帧下标
 * @throws {Error} 导入轨迹只剩两点时抛出
 */
export const deleteKeyframe = (name: string, index: number) => {
  const { motion } = entityInfo(name)
  const keys = motion?.keyframes ?? []
  if (index <= 0 || index >= keys.length) return
  const next = keys.filter((_, i) => i !== index).map(({ t, x, y }) => ({ t, x, y }))
  const imported = motion?.managed === false && motion.trajectoryIndex !== undefined
  if (imported && next.length < 2) throw new Error('导入的轨迹至少需要保留两个关键帧')
  commitKeyframes(name, next, `删除 ${name} 关键帧`)
  store().select(name, undefined)
}

/**
 * 删除实体
 * @param name - 实体名
 * @returns 仍引用该实体的元素数量
 */
export const deleteEntity = (name: string): number => {
  const { xosc } = store()
  if (!xosc) return 0
  const { doc, danglingRefs } = removeEntity(xosc.doc, name)
  store().commit('xosc', doc, `删除 ${name}`)
  store().select(undefined)
  return danglingRefs
}

/**
 * 重命名实体
 * @param from - 原名
 * @param to - 新名
 * @throws {Error} 名称无效或重复时抛出
 */
export const renameSelected = (from: string, to: string) => {
  const { xosc } = store()
  if (!xosc) return
  const doc = renameEntity(xosc.doc, from, to)
  if (doc === xosc.doc) return
  store().commit('xosc', doc, `重命名 ${from} → ${to.trim()}`)
  store().select(to.trim())
}

/**
 * 修改实体类别、尺寸与角色
 * @param name - 实体名
 * @param props - 字段；role 为空串表示清除
 * @returns 场景是否因角色属性升级到 OpenSCENARIO 1.2
 */
export const updateEntityProps = (
  name: string,
  props: Partial<Pick<EntityDraft, 'category' | 'length' | 'width' | 'height' | 'role'>>,
): boolean => {
  const { xosc } = store()
  if (!xosc) return false
  const next = setEntityProps(xosc.doc, name, props)
  const upgraded = revMinor(next) > revMinor(xosc.doc)
  store().commit(
    'xosc',
    next,
    upgraded ? `修改 ${name} 属性（升级为 OpenSCENARIO 1.2）` : `修改 ${name} 属性`,
  )
  return upgraded
}

/**
 * 修改初始位姿
 * @param name - 实体名
 * @param pose - 新位姿
 */
export const updateInitPose = (name: string, pose: InitPose) => {
  const { xosc } = store()
  const { motion } = entityInfo(name)
  if (!xosc) return
  const keys = motion?.keyframes ?? []
  if (keys.length >= 2 && pose.kind === 'world') {
    // 有轨迹时首帧即初始位置，一并更新
    const next: Keyframe[] = keys.map(({ t, x, y }) => ({ t, x, y }))
    next[0] = { t: 0, x: pose.x, y: pose.y, h: pose.h }
    commitKeyframes(name, next, `修改 ${name} 初始位置`)
    return
  }
  store().commit('xosc', setInitPose(xosc.doc, name, pose), `修改 ${name} 初始位置`)
}

/**
 * 修改初始速度
 * @param name - 实体名
 * @param speed - m/s
 */
export const updateInitSpeed = (name: string, speed: number) => {
  const { xosc } = store()
  if (xosc) store().commit('xosc', setInitSpeed(xosc.doc, name, speed), `修改 ${name} 初始速度`)
}

/**
 * 目录引用转内联
 * @param entity - 实体（使用当前尺寸）
 */
export const convertToInline = (entity: OscEntity) => {
  const { xosc } = store()
  if (!xosc) return
  const doc = catalogToInline(xosc.doc, {
    name: entity.name,
    kind: entity.kind,
    category: entity.category,
    length: entity.length,
    width: entity.width,
    height: entity.height,
  })
  store().commit('xosc', doc, `${entity.name} 转为内联定义`)
}

/**
 * 修改仿真时长，并同步时间轴显示范围
 * @param seconds - 秒
 */
export const updateStopTime = (seconds: number) => {
  const { xosc } = store()
  store().setUi({ duration: seconds })
  if (xosc) store().commit('xosc', setStopTime(xosc.doc, seconds), `设置时长 ${seconds}s`)
}

/**
 * 修改 LogicFile
 * @param filepath - xodr 路径
 */
export const updateLogicFile = (filepath: string) => {
  const { xosc } = store()
  if (xosc) store().commit('xosc', setLogicFile(xosc.doc, filepath), '修改 LogicFile')
}
