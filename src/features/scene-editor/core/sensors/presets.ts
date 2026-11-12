import { intrinsicsFromFov } from './camera'
import type { Sensor, SensorDraft, SensorPose } from './types'

/** 传感器预设 */
export interface SensorPreset {
  id: string
  label: string
  /** 新传感器 id 的前缀 */
  idPrefix: string
  create: () => SensorDraft
}

/**
 * 安装位姿（未给出的角度为 0）
 * @param x - 前向（米，相对后轴中心）
 * @param y - 左向（米）
 * @param z - 高度（米）
 * @param yaw - 偏航（度，向左为正）
 * @returns 位姿
 */
const pose = (x: number, y: number, z: number, yaw = 0): SensorPose => ({
  x,
  y,
  z,
  roll: 0,
  pitch: 0,
  yaw,
})

/**
 * 相机预设
 * @param name - 名称
 * @param p - 安装位姿
 * @param fov - 水平视场角（度）
 * @returns 传感器（不含 id）
 */
const camera = (name: string, p: SensorPose, fov: number): SensorDraft => ({
  name,
  type: 'camera',
  frequency: 30,
  pose: p,
  camera: {
    width: 1920,
    height: 1080,
    fov,
    model: 'pinhole',
    intrinsics: intrinsicsFromFov(fov, 1920, 1080),
    distortion: [0, 0, 0, 0, 0],
  },
})

/**
 * 毫米波雷达预设
 * @param name - 名称
 * @param p - 安装位姿
 * @param horizontalFov - 水平视场角（度）
 * @param range - 探测距离（米）
 * @returns 传感器（不含 id）
 */
const radar = (name: string, p: SensorPose, horizontalFov: number, range: number): SensorDraft => ({
  name,
  type: 'radar',
  frequency: 20,
  pose: p,
  radar: { horizontalFov, verticalFov: 10, range, frequencyGHz: 77 },
})

/** 传感器预设（安装位姿按 4.6 m 轿车估算：后轴中心为原点，车头约在 x = 3.7 m） */
export const SENSOR_PRESETS: SensorPreset[] = [
  {
    id: 'cam-front',
    label: '前视主相机 60°',
    idPrefix: 'cam_front',
    create: () => camera('前视主相机', pose(1.9, 0, 1.4), 60),
  },
  {
    id: 'cam-tele',
    label: '前视长焦相机 30°',
    idPrefix: 'cam_tele',
    create: () => camera('前视长焦相机', pose(1.9, 0, 1.4), 30),
  },
  {
    id: 'cam-left',
    label: '左前相机 70°',
    idPrefix: 'cam_left',
    create: () => camera('左前相机', pose(2.0, 0.9, 1.0, 45), 70),
  },
  {
    id: 'cam-right',
    label: '右前相机 70°',
    idPrefix: 'cam_right',
    create: () => camera('右前相机', pose(2.0, -0.9, 1.0, -45), 70),
  },
  {
    id: 'cam-rear',
    label: '后视相机 90°',
    idPrefix: 'cam_rear',
    create: () => camera('后视相机', pose(-0.9, 0, 1.0, 180), 90),
  },
  {
    id: 'lidar-top',
    label: '主激光雷达 128 线',
    idPrefix: 'lidar_top',
    create: () => ({
      name: '主激光雷达',
      type: 'lidar',
      frequency: 10,
      pose: pose(1.2, 0, 1.9),
      lidar: {
        channels: 128,
        range: 200,
        horizontalFov: 360,
        verticalFov: [-25, 15],
        rotationFrequency: 10,
      },
    }),
  },
  {
    id: 'radar-front',
    label: '前向毫米波雷达',
    idPrefix: 'radar_front',
    create: () => radar('前向毫米波雷达', pose(3.6, 0, 0.5), 120, 200),
  },
  {
    id: 'radar-fl',
    label: '左前角雷达',
    idPrefix: 'radar_fl',
    create: () => radar('左前角雷达', pose(3.4, 0.8, 0.5, 45), 150, 80),
  },
  {
    id: 'radar-fr',
    label: '右前角雷达',
    idPrefix: 'radar_fr',
    create: () => radar('右前角雷达', pose(3.4, -0.8, 0.5, -45), 150, 80),
  },
  {
    id: 'radar-rl',
    label: '左后角雷达',
    idPrefix: 'radar_rl',
    create: () => radar('左后角雷达', pose(-0.8, 0.8, 0.5, 135), 150, 80),
  },
  {
    id: 'radar-rr',
    label: '右后角雷达',
    idPrefix: 'radar_rr',
    create: () => radar('右后角雷达', pose(-0.8, -0.8, 0.5, -135), 150, 80),
  },
]

/** 默认套件：前视主相机 + 主激光雷达 + 前向毫米波雷达 */
export const DEFAULT_SENSOR_KIT = ['cam-front', 'lidar-top', 'radar-front']

/**
 * 生成不重复的传感器 id
 * @param existing - 已有 id
 * @param prefix - 前缀
 * @returns 新 id（前缀本身未占用时直接用前缀，否则加序号）
 */
export const uniqueSensorId = (existing: Iterable<string>, prefix: string): string => {
  const set = new Set(existing)
  if (!set.has(prefix)) return prefix
  for (let i = 2; ; i++) if (!set.has(`${prefix}_${i}`)) return `${prefix}_${i}`
}

/**
 * 按预设创建传感器
 * @param presetId - 预设 id
 * @param existing - 已有传感器 id
 * @returns 新传感器；预设不存在时返回 undefined
 */
export const createSensor = (presetId: string, existing: Iterable<string>): Sensor | undefined => {
  const preset = SENSOR_PRESETS.find((p) => p.id === presetId)
  if (!preset) return undefined
  return { id: uniqueSensorId(existing, preset.idPrefix), ...preset.create() }
}
