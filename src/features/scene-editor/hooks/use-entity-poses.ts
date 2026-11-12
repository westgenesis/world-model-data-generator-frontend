import { useMemo } from 'react'
import type { Pose } from '../core/opendrive/geometry'
import { poseAt } from '../core/openscenario/motion'
import { useSceneEditorStore } from '../stores/scene-editor-store'
import type { SceneModel } from './use-scene-model'

/**
 * 计算播放头时刻各实体的位姿：有轨迹时按关键帧插值，否则取初始位置
 * @param scene - 场景派生数据
 * @returns 实体名 → 位姿
 */
export const useEntityPoses = (scene: SceneModel | undefined): ReadonlyMap<string, Pose> => {
  const time = useSceneEditorStore((s) => s.time)
  return useMemo(() => {
    const result = new Map<string, Pose>()
    if (!scene) return result
    for (const e of scene.scenario.entities) {
      const keys = scene.motions.get(e.name)?.keyframes ?? []
      const pose = keys.length >= 2 ? poseAt(keys, time) : scene.poses.get(e.name)
      if (pose) result.set(e.name, { x: pose.x, y: pose.y, hdg: pose.hdg })
    }
    return result
  }, [scene, time])
}
