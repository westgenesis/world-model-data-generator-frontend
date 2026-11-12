import type {
  CameraParams,
  LidarParams,
  RadarParams,
  Sensor,
  SensorConfig,
  SensorPose,
  SensorType,
} from './types'
import { SENSOR_FORMAT, SENSOR_VERSION } from './types'

/** 传感器配置校验失败（message 带字段路径，如 sensors[0].camera.fov） */
export class SensorConfigError extends Error {
  override name = 'SensorConfigError'
}

type Json = Record<string, unknown>

/**
 * 读取对象字段
 * @param v - 任意值
 * @param path - 字段路径
 * @returns 对象
 * @throws {SensorConfigError} 不是对象时抛出
 */
const obj = (v: unknown, path: string): Json => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) {
    throw new SensorConfigError(`${path} 应为对象`)
  }
  return v as Json
}

/**
 * 读取数值字段
 * @param o - 所在对象
 * @param key - 字段名
 * @param path - 所在对象路径
 * @param range - 取值范围 [下限, 上限]（含）
 * @returns 数值
 * @throws {SensorConfigError} 缺失、不是数值或超出范围时抛出
 */
const num = (o: Json, key: string, path: string, range?: [number, number]): number => {
  const v = o[key]
  const at = `${path}.${key}`
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new SensorConfigError(`${at} 应为数值`)
  if (range && (v < range[0] || v > range[1])) {
    throw new SensorConfigError(`${at} 应在 ${range[0]} ~ ${range[1]} 之间，当前为 ${v}`)
  }
  return v
}

/**
 * 读取字符串字段
 * @param o - 所在对象
 * @param key - 字段名
 * @param path - 所在对象路径
 * @returns 非空字符串
 * @throws {SensorConfigError} 缺失或为空时抛出
 */
const str = (o: Json, key: string, path: string): string => {
  const v = o[key]
  if (typeof v !== 'string' || !v.trim())
    throw new SensorConfigError(`${path}.${key} 应为非空字符串`)
  return v
}

/**
 * 解析安装位姿
 * @param v - 原始值
 * @param path - 字段路径
 * @returns 位姿
 */
const parsePose = (v: unknown, path: string): SensorPose => {
  const o = obj(v, path)
  return {
    x: num(o, 'x', path, [-50, 50]),
    y: num(o, 'y', path, [-50, 50]),
    z: num(o, 'z', path, [-10, 20]),
    roll: num(o, 'roll', path, [-180, 180]),
    pitch: num(o, 'pitch', path, [-90, 90]),
    yaw: num(o, 'yaw', path, [-180, 180]),
  }
}

/**
 * 解析相机参数
 * @param v - 原始值
 * @param path - 字段路径
 * @returns 相机参数
 */
const parseCamera = (v: unknown, path: string): CameraParams => {
  const o = obj(v, path)
  const model = o.model ?? 'pinhole'
  if (model !== 'pinhole' && model !== 'fisheye') {
    throw new SensorConfigError(`${path}.model 应为 pinhole 或 fisheye`)
  }
  const ip = `${path}.intrinsics`
  const intr = obj(o.intrinsics, ip)
  const distortion = o.distortion ?? []
  if (!Array.isArray(distortion) || distortion.some((d) => typeof d !== 'number')) {
    throw new SensorConfigError(`${path}.distortion 应为数值数组`)
  }
  return {
    width: num(o, 'width', path, [1, 16384]),
    height: num(o, 'height', path, [1, 16384]),
    fov: num(o, 'fov', path, [1, 360]),
    model,
    intrinsics: {
      fx: num(intr, 'fx', ip, [1e-6, 1e6]),
      fy: num(intr, 'fy', ip, [1e-6, 1e6]),
      cx: num(intr, 'cx', ip),
      cy: num(intr, 'cy', ip),
    },
    distortion: distortion as number[],
    ...(o.calibrated === true ? { calibrated: true } : {}),
  }
}

/**
 * 解析激光雷达参数
 * @param v - 原始值
 * @param path - 字段路径
 * @returns 激光雷达参数
 */
const parseLidar = (v: unknown, path: string): LidarParams => {
  const o = obj(v, path)
  const vf = o.verticalFov
  if (
    !Array.isArray(vf) ||
    vf.length !== 2 ||
    vf.some((d) => typeof d !== 'number') ||
    vf[0] >= vf[1]
  ) {
    throw new SensorConfigError(`${path}.verticalFov 应为 [下限, 上限]，且下限小于上限`)
  }
  return {
    channels: num(o, 'channels', path, [1, 1024]),
    range: num(o, 'range', path, [0.1, 2000]),
    horizontalFov: num(o, 'horizontalFov', path, [1, 360]),
    verticalFov: [vf[0] as number, vf[1] as number],
    rotationFrequency: num(o, 'rotationFrequency', path, [0.1, 100]),
  }
}

/**
 * 解析毫米波雷达参数
 * @param v - 原始值
 * @param path - 字段路径
 * @returns 雷达参数
 */
const parseRadar = (v: unknown, path: string): RadarParams => {
  const o = obj(v, path)
  return {
    horizontalFov: num(o, 'horizontalFov', path, [1, 360]),
    verticalFov: num(o, 'verticalFov', path, [1, 180]),
    range: num(o, 'range', path, [0.1, 2000]),
    frequencyGHz: num(o, 'frequencyGHz', path, [1, 300]),
  }
}

const TYPES: SensorType[] = ['camera', 'lidar', 'radar']

/**
 * 解析单个传感器
 * @param v - 原始值
 * @param path - 字段路径
 * @returns 传感器
 */
const parseSensor = (v: unknown, path: string): Sensor => {
  const o = obj(v, path)
  const type = o.type as SensorType
  if (!TYPES.includes(type)) throw new SensorConfigError(`${path}.type 应为 ${TYPES.join(' / ')}`)
  const base = {
    id: str(o, 'id', path),
    name: typeof o.name === 'string' && o.name.trim() ? o.name : str(o, 'id', path),
    frequency: num(o, 'frequency', path, [0.1, 1000]),
    pose: parsePose(o.pose, `${path}.pose`),
  }
  if (type === 'camera') return { ...base, type, camera: parseCamera(o.camera, `${path}.camera`) }
  if (type === 'lidar') return { ...base, type, lidar: parseLidar(o.lidar, `${path}.lidar`) }
  return { ...base, type, radar: parseRadar(o.radar, `${path}.radar`) }
}

/**
 * 解析并校验传感器配置
 * @param text - JSON 文本
 * @returns 配置
 * @throws {SensorConfigError} 不是合法 JSON、格式标识不符或字段不合法时抛出
 */
export const parseSensorConfig = (text: string): SensorConfig => {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch (e) {
    throw new SensorConfigError(`不是合法的 JSON：${e instanceof Error ? e.message : String(e)}`)
  }
  const root = obj(json, '根节点')
  if (root.format !== SENSOR_FORMAT) {
    throw new SensorConfigError(`format 应为 "${SENSOR_FORMAT}"`)
  }
  if (root.version !== SENSOR_VERSION) {
    throw new SensorConfigError(
      `不支持的 version：${String(root.version)}（当前支持 ${SENSOR_VERSION}）`,
    )
  }
  if (!Array.isArray(root.sensors)) throw new SensorConfigError('sensors 应为数组')
  const sensors = root.sensors.map((s, i) => parseSensor(s, `sensors[${i}]`))
  const seen = new Set<string>()
  sensors.forEach((s, i) => {
    if (seen.has(s.id)) throw new SensorConfigError(`sensors[${i}].id 重复：${s.id}`)
    seen.add(s.id)
  })
  return { format: SENSOR_FORMAT, version: SENSOR_VERSION, sensors }
}

/**
 * 是否为传感器配置文件（按 format 字段识别，不做完整校验）
 * @param text - 文件内容
 * @returns 是否为本格式
 */
export const isSensorConfigText = (text: string) => {
  try {
    const json = JSON.parse(text) as { format?: unknown }
    return json?.format === SENSOR_FORMAT
  } catch {
    return false
  }
}

/**
 * 按固定字段顺序输出传感器：id、name、type、frequency、pose，最后是该类型的参数
 * @param sensor - 传感器
 * @returns 字段顺序固定的普通对象
 */
const ordered = (sensor: Sensor) => {
  const { id, name, type, frequency, pose } = sensor
  const params =
    sensor.type === 'camera'
      ? { camera: sensor.camera }
      : sensor.type === 'lidar'
        ? { lidar: sensor.lidar }
        : { radar: sensor.radar }
  return { id, name, type, frequency, pose, ...params }
}

/**
 * 序列化传感器配置（两空格缩进，末尾换行；字段顺序固定，便于阅读和比对）
 * @param config - 配置
 * @returns JSON 文本
 */
export const serializeSensorConfig = (config: SensorConfig) =>
  `${JSON.stringify(
    { format: config.format, version: config.version, sensors: config.sensors.map(ordered) },
    null,
    2,
  )}\n`

/**
 * 创建空配置
 * @returns 配置
 */
export const emptySensorConfig = (): SensorConfig => ({
  format: SENSOR_FORMAT,
  version: SENSOR_VERSION,
  sensors: [],
})
