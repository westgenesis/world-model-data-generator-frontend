/**
 * 自车传感器配置（独立 JSON 文件，由 xosc 自车 Properties 中的 <File> 引用）。
 * 坐标系：车辆坐标系，原点为后轴中心（与 OpenSCENARIO 一致），x 向前、y 向左、z 向上，单位米；
 * 角度单位为度，yaw 向左为正，pitch 向下为正，roll 向右倾为正。
 */

/** 文件格式标识 */
export const SENSOR_FORMAT = 'wmdg-sensor-config'

/** 当前格式版本 */
export const SENSOR_VERSION = 1

/** 传感器类型 */
export type SensorType = 'camera' | 'lidar' | 'radar'

/** 安装位姿（车辆坐标系） */
export interface SensorPose {
  x: number
  y: number
  z: number
  roll: number
  pitch: number
  yaw: number
}

/** 相机内参（像素） */
export interface CameraIntrinsics {
  fx: number
  fy: number
  cx: number
  cy: number
}

/** 相机参数 */
export interface CameraParams {
  width: number
  height: number
  /** 水平视场角（度） */
  fov: number
  /** 投影模型：针孔 / 鱼眼 */
  model: 'pinhole' | 'fisheye'
  intrinsics: CameraIntrinsics
  /** 畸变系数：针孔为 k1 k2 p1 p2 k3，鱼眼为 k1 k2 k3 k4 */
  distortion: number[]
  /** 内参来自标定文件；为 true 时修改 FOV 不再重算内参 */
  calibrated?: boolean
}

/** 激光雷达参数 */
export interface LidarParams {
  channels: number
  /** 量程（米） */
  range: number
  /** 水平视场角（度） */
  horizontalFov: number
  /** 垂直视场角范围 [下限, 上限]（度） */
  verticalFov: [number, number]
  /** 旋转频率（Hz） */
  rotationFrequency: number
}

/** 毫米波雷达参数 */
export interface RadarParams {
  /** 水平视场角（度） */
  horizontalFov: number
  /** 垂直视场角（度） */
  verticalFov: number
  /** 探测距离（米） */
  range: number
  /** 工作频率（GHz） */
  frequencyGHz: number
}

interface SensorBase {
  id: string
  name: string
  /** 输出频率（Hz） */
  frequency: number
  pose: SensorPose
}

/** 单个传感器 */
export type Sensor =
  | (SensorBase & { type: 'camera'; camera: CameraParams })
  | (SensorBase & { type: 'lidar'; lidar: LidarParams })
  | (SensorBase & { type: 'radar'; radar: RadarParams })

/** 不含 id 的传感器（按类型分别去掉 id，保留联合类型的区分） */
export type SensorDraft = Sensor extends infer S
  ? S extends Sensor
    ? Omit<S, 'id'>
    : never
  : never

/** 传感器配置文件 */
export interface SensorConfig {
  format: typeof SENSOR_FORMAT
  version: typeof SENSOR_VERSION
  sensors: Sensor[]
}

/** 传感器配置文档：配置 + 文件名 */
export interface SensorSource {
  config: SensorConfig
  fileName: string
}

/** 传感器类型的中文名 */
export const SENSOR_TYPE_LABEL: Record<SensorType, string> = {
  camera: '相机',
  lidar: '激光雷达',
  radar: '毫米波雷达',
}
