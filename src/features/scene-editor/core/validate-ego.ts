import type { Scenario } from './openscenario/types'
import { fovFromIntrinsics } from './sensors/camera'
import type { SensorConfig } from './sensors/types'
import type { Issue } from './validate'

/** 安装点距离车身包围盒超过该值（米）时提示 */
const MOUNT_TOLERANCE = 3

/** 相机内参推算的 FOV 与配置值相差超过该值（度）时提示 */
const FOV_TOLERANCE = 1

/**
 * 校验自车与传感器配置
 * @param scenario - 场景
 * @param sensors - 传感器配置；未加载时为 undefined
 * @returns 问题列表
 */
export const validateEgo = (scenario: Scenario, sensors: SensorConfig | undefined): Issue[] => {
  const issues: Issue[] = []
  const egos = scenario.entities.filter((e) => e.ego)
  if (egos.length === 0) {
    issues.push({ level: 'info', message: '未指定自车（在「自车」页签选择一辆车）' })
  } else if (egos.length > 1) {
    issues.push({
      level: 'error',
      message: `有 ${egos.length} 个实体标记为自车：${egos.map((e) => e.name).join('、')}`,
    })
  }
  for (const e of egos) {
    if (e.kind !== 'vehicle') {
      issues.push({ level: 'error', message: `自车「${e.name}」不是车辆`, entity: e.name })
    }
  }
  if (scenario.sensorFile && !sensors) {
    issues.push({
      level: 'warning',
      message: `场景引用了传感器配置「${scenario.sensorFile}」，但未加载该文件`,
    })
  }
  if (!sensors) return issues
  if (sensors.sensors.length && egos.length === 0) {
    issues.push({ level: 'warning', message: '有传感器配置，但场景中没有自车' })
  }

  const ego = egos.length === 1 ? egos[0] : undefined
  const ids = new Set<string>()
  for (const s of sensors.sensors) {
    if (ids.has(s.id)) issues.push({ level: 'error', message: `传感器 id「${s.id}」重复` })
    ids.add(s.id)
    if (s.type === 'camera') {
      const derived = fovFromIntrinsics(s.camera.intrinsics.fx, s.camera.width)
      if (Math.abs(derived - s.camera.fov) > FOV_TOLERANCE) {
        issues.push({
          level: 'info',
          message: `相机「${s.name}」内参对应的水平 FOV 为 ${derived.toFixed(1)}°，与配置的 ${s.camera.fov}° 不一致`,
        })
      }
    }
    if (ego) {
      // 车辆坐标系下包围盒：x ∈ [centerX - L/2, centerX + L/2]，y ∈ [-W/2, W/2]
      const dx = Math.max(0, Math.abs(s.pose.x - ego.centerX) - ego.length / 2)
      const dy = Math.max(0, Math.abs(s.pose.y) - ego.width / 2)
      const off = Math.hypot(dx, dy)
      if (off > MOUNT_TOLERANCE) {
        issues.push({
          level: 'warning',
          message: `传感器「${s.name}」安装点距车身 ${off.toFixed(1)} m，请检查位姿`,
          entity: ego.name,
        })
      }
    }
  }
  return issues
}
