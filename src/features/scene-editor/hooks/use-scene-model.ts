import { useMemo } from 'react'
import type { NetworkMesh } from '../core/opendrive/lanes'
import { buildNetworkMesh } from '../core/opendrive/lanes'
import { parseOpenDrive } from '../core/opendrive/parse'
import type { RoadNetwork } from '../core/opendrive/types'
import type { EntityMotion } from '../core/openscenario/motion'
import { buildMotions } from '../core/openscenario/motion'
import { parseOpenScenario } from '../core/openscenario/parse'
import type { ResolvedPose } from '../core/openscenario/resolve'
import { resolveInitPoses } from '../core/openscenario/resolve'
import type { Scenario } from '../core/openscenario/types'
import type { XmlSource } from '../core/xml'
import { useSceneEditorStore } from '../stores/scene-editor-store'

/** 路网派生数据 */
export interface RoadModel {
  network: RoadNetwork
  mesh: NetworkMesh
  /** 解析与采样耗时（毫秒） */
  timings: { parse: number; mesh: number }
}

/** 场景派生数据 */
export interface SceneModel {
  scenario: Scenario
  poses: ReadonlyMap<string, ResolvedPose>
  motions: ReadonlyMap<string, EntityMotion>
}

// 文档对象不可变，按引用缓存派生结果；多个组件共用同一份
const roadCache = new WeakMap<XmlSource, RoadModel>()
const sceneCache = new WeakMap<XmlSource, { road?: RoadModel; model: SceneModel }>()

/**
 * 解析并采样路网（带缓存）
 * @param source - xodr 源
 * @returns 路网派生数据
 */
export const deriveRoad = (source: XmlSource): RoadModel => {
  const cached = roadCache.get(source)
  if (cached) return cached
  const t0 = performance.now()
  const network = parseOpenDrive(source.doc)
  const t1 = performance.now()
  const mesh = buildNetworkMesh(network)
  const model = { network, mesh, timings: { parse: t1 - t0, mesh: performance.now() - t1 } }
  roadCache.set(source, model)
  return model
}

/**
 * 解析场景并计算初始位姿与运动（带缓存，路网变化时重新计算）
 * @param source - xosc 源
 * @param road - 路网派生数据
 * @returns 场景派生数据
 */
export const deriveScene = (source: XmlSource, road: RoadModel | undefined): SceneModel => {
  const cached = sceneCache.get(source)
  if (cached && cached.road === road) return cached.model
  const scenario = parseOpenScenario(source.doc)
  const poses = resolveInitPoses(scenario, road?.network)
  const model = { scenario, poses, motions: buildMotions(scenario, road?.network, poses) }
  sceneCache.set(source, { road, model })
  return model
}

/**
 * 订阅当前文档的派生模型
 * @returns 路网与场景派生数据（未加载时为 undefined）
 */
export const useSceneModel = () => {
  const xodr = useSceneEditorStore((s) => s.xodr)
  const xosc = useSceneEditorStore((s) => s.xosc)
  const road = useMemo(() => (xodr ? deriveRoad(xodr) : undefined), [xodr])
  const scene = useMemo(() => (xosc ? deriveScene(xosc, road) : undefined), [xosc, road])
  return { road, scene }
}

/**
 * 在事件处理等非渲染场景中读取当前派生模型
 * @returns 路网与场景派生数据
 */
export const getSceneModel = () => {
  const { xodr, xosc } = useSceneEditorStore.getState()
  const road = xodr ? deriveRoad(xodr) : undefined
  return { road, scene: xosc ? deriveScene(xosc, road) : undefined }
}
