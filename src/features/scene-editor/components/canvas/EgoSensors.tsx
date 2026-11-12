import { Circle, Group, Line } from 'react-konva'
import type { Sensor, SensorType } from '../../core/sensors/types'
import type { CanvasColors } from './palette'

const DEG = Math.PI / 180

/** 相机没有量程，FOV 扇形按该距离示意（米） */
const CAMERA_PREVIEW_RANGE = 80

/**
 * 传感器类型对应的颜色
 * @param type - 传感器类型
 * @param colors - 画布配色
 * @returns 颜色
 */
const colorOf = (type: SensorType, colors: CanvasColors) =>
  type === 'camera'
    ? colors.sensorCamera
    : type === 'lidar'
      ? colors.sensorLidar
      : colors.sensorRadar

/**
 * 传感器的水平视场角与量程
 * @param sensor - 传感器
 * @returns 视场角（度）与量程（米）
 */
const coverageOf = (sensor: Sensor) => {
  if (sensor.type === 'camera') return { fov: sensor.camera.fov, range: CAMERA_PREVIEW_RANGE }
  if (sensor.type === 'lidar') return { fov: sensor.lidar.horizontalFov, range: sensor.lidar.range }
  return { fov: sensor.radar.horizontalFov, range: sensor.radar.range }
}

interface SensorMountsProps {
  sensors: Sensor[]
  colors: CanvasColors
  /** 一个屏幕像素对应的世界长度（米） */
  px: number
  selected?: string
}

/**
 * 自车上的传感器安装点与朝向（车辆坐标系，放在自车实体 Group 内，随车移动、旋转）
 */
export const SensorMounts = ({ sensors, colors, px, selected }: SensorMountsProps) => (
  <Group listening={false}>
    {sensors.map((s) => {
      const color = colorOf(s.type, colors)
      const active = s.id === selected
      const r = Math.max(0.12, (active ? 4.5 : 3.5) * px)
      const tick = Math.max(0.6, 12 * px)
      const a = s.pose.yaw * DEG
      return (
        <Group key={s.id}>
          {s.type !== 'lidar' && (
            <Line
              points={[
                s.pose.x,
                s.pose.y,
                s.pose.x + tick * Math.cos(a),
                s.pose.y + tick * Math.sin(a),
              ]}
              stroke={color}
              strokeWidth={active ? 2.5 : 1.5}
              strokeScaleEnabled={false}
              lineCap="round"
            />
          )}
          <Circle
            x={s.pose.x}
            y={s.pose.y}
            radius={r}
            fill={color}
            stroke={active ? colors.selected : colors.white}
            strokeWidth={active ? 2 : 1}
            strokeScaleEnabled={false}
          />
        </Group>
      )
    })}
  </Group>
)

/**
 * 选中传感器的水平覆盖范围（俯视扇形；360° 时为圆），车辆坐标系。
 * 相机按 80 m 示意，激光雷达与毫米波雷达按各自量程
 * @param props.sensor - 传感器
 * @param props.colors - 画布配色
 * @param props.px - 一个屏幕像素对应的世界长度（米）
 */
export const SensorCoverage = ({
  sensor,
  colors,
  px,
}: {
  sensor: Sensor
  colors: CanvasColors
  px: number
}) => {
  const color = colorOf(sensor.type, colors)
  const { fov, range } = coverageOf(sensor)
  const { x, y, yaw } = sensor.pose
  const common = {
    fill: color,
    opacity: 0.16,
    stroke: color,
    strokeWidth: 1.5,
    strokeScaleEnabled: false,
    dash: [6 * px, 4 * px],
    listening: false,
  }
  if (fov >= 360) return <Circle x={x} y={y} radius={range} {...common} />
  const steps = Math.max(8, Math.ceil(fov / 3))
  const points = [x, y]
  for (let i = 0; i <= steps; i++) {
    const a = (yaw - fov / 2 + (fov * i) / steps) * DEG
    points.push(x + range * Math.cos(a), y + range * Math.sin(a))
  }
  return <Line points={points} closed {...common} />
}
