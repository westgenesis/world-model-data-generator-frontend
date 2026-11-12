import { describe, expect, it } from 'vitest'
import { fovFromIntrinsics, importCalibration, intrinsicsFromFov, updateCamera } from './camera'
import { createSensor, DEFAULT_SENSOR_KIT, uniqueSensorId } from './presets'
import {
  emptySensorConfig,
  isSensorConfigText,
  parseSensorConfig,
  serializeSensorConfig,
} from './schema'
import type { Sensor, SensorConfig } from './types'

/**
 * 按默认套件生成配置
 * @returns 配置
 */
const kit = (): SensorConfig => {
  const config = emptySensorConfig()
  for (const id of DEFAULT_SENSOR_KIT) {
    const sensor = createSensor(
      id,
      config.sensors.map((s) => s.id),
    )
    if (sensor) config.sensors.push(sensor)
  }
  return config
}

describe('相机内参', () => {
  it('FOV 与内参互相换算', () => {
    const k = intrinsicsFromFov(90, 1920, 1080)
    expect(k.fx).toBeCloseTo(960)
    expect(k).toMatchObject({ cx: 960, cy: 540 })
    expect(fovFromIntrinsics(k.fx, 1920)).toBeCloseTo(90)
  })

  it('未标定时改 FOV 重算内参；已标定时保留内参', () => {
    const cam = createSensor('cam-front', []) as Extract<Sensor, { type: 'camera' }>
    const wider = updateCamera(cam.camera, { fov: 90 })
    expect(wider.intrinsics.fx).toBeCloseTo(960)
    const calibrated = updateCamera({ ...cam.camera, calibrated: true }, { fov: 90 })
    expect(calibrated.intrinsics).toEqual(cam.camera.intrinsics)
  })

  it('导入 OpenCV 风格标定', () => {
    const cam = createSensor('cam-front', []) as Extract<Sensor, { type: 'camera' }>
    const text = JSON.stringify({
      image_width: 1280,
      image_height: 720,
      camera_matrix: { rows: 3, cols: 3, data: [640, 0, 640, 0, 640, 360, 0, 0, 1] },
      distortion_coefficients: { data: [-0.1, 0.02, 0, 0, 0] },
    })
    const next = importCalibration(text, cam.camera)
    expect(next).toMatchObject({ width: 1280, height: 720, calibrated: true })
    expect(next.intrinsics).toEqual({ fx: 640, fy: 640, cx: 640, cy: 360 })
    expect(next.distortion).toEqual([-0.1, 0.02, 0, 0, 0])
    expect(next.fov).toBeCloseTo(90)
  })

  it('导入 K / D 写法，缺少内参时报错', () => {
    const cam = createSensor('cam-front', []) as Extract<Sensor, { type: 'camera' }>
    const next = importCalibration(
      JSON.stringify({
        K: [
          [1000, 0, 960],
          [0, 1000, 540],
          [0, 0, 1],
        ],
        D: [0.1],
      }),
      cam.camera,
    )
    expect(next.intrinsics.fx).toBe(1000)
    expect(() => importCalibration('{"width": 10}', cam.camera)).toThrow('内参')
    expect(() => importCalibration('not json', cam.camera)).toThrow('JSON')
  })
})

describe('传感器配置文件', () => {
  it('序列化后能原样解析', () => {
    const config = kit()
    expect(config.sensors.map((s) => s.type)).toEqual(['camera', 'lidar', 'radar'])
    const text = serializeSensorConfig(config)
    expect(isSensorConfigText(text)).toBe(true)
    expect(parseSensorConfig(text)).toEqual(config)
  })

  it('错误信息带字段路径', () => {
    const config = kit()
    const bad = JSON.parse(serializeSensorConfig(config)) as SensorConfig
    ;(bad.sensors[0] as Extract<Sensor, { type: 'camera' }>).camera.fov = 400
    expect(() => parseSensorConfig(JSON.stringify(bad))).toThrow('sensors[0].camera.fov')
    bad.sensors[0] = { ...bad.sensors[1] }
    expect(() => parseSensorConfig(JSON.stringify(bad))).toThrow('id 重复')
    expect(() => parseSensorConfig('{"format":"x"}')).toThrow('format')
    expect(() => parseSensorConfig('{')).toThrow('JSON')
  })

  it('生成不重复的 id', () => {
    expect(uniqueSensorId([], 'cam')).toBe('cam')
    expect(uniqueSensorId(['cam', 'cam_2'], 'cam')).toBe('cam_3')
  })
})
