import { App, Button, Select, Tag, Tooltip } from 'antd'
import { FileUp, RefreshCw } from 'lucide-react'
import { useRef } from 'react'
import { intrinsicsFromFov, updateCamera } from '../../core/sensors/camera'
import type {
  CameraParams,
  LidarParams,
  RadarParams,
  Sensor,
  SensorPose,
} from '../../core/sensors/types'
import { SENSOR_TYPE_LABEL } from '../../core/sensors/types'
import { importCameraCalibration, renameSensor, updateSensor } from '../../hooks/ego-actions'
import { Field, NumberField, TextField } from './fields'

/** 位姿字段：键、标签、单位 */
const POSE_FIELDS: [keyof SensorPose, string][] = [
  ['x', 'X m'],
  ['y', 'Y m'],
  ['z', 'Z m'],
  ['roll', '横滚 °'],
  ['pitch', '俯仰 °'],
  ['yaw', '偏航 °'],
]

interface SensorFormProps {
  sensor: Sensor
  run: (fn: () => void) => void
}

/**
 * 传感器详情表单：名称、id、频率、安装位姿与各类型参数
 * @param props.sensor - 传感器
 * @param props.run - 统一处理异常
 */
export const SensorForm = ({ sensor, run }: SensorFormProps) => {
  const { id } = sensor
  /** 修改基础字段 */
  const patch = (fields: Partial<Pick<Sensor, 'name' | 'frequency'>>) =>
    run(() => updateSensor(id, (s) => ({ ...s, ...fields }) as Sensor))
  /** 修改位姿 */
  const patchPose = (key: keyof SensorPose, value: number) =>
    run(() => updateSensor(id, (s) => ({ ...s, pose: { ...s.pose, [key]: value } })))

  return (
    <section className="grid grid-cols-3 gap-x-2 gap-y-2.5">
      <h4 className="col-span-full flex items-center gap-2 text-xs font-medium text-fg-3">
        {SENSOR_TYPE_LABEL[sensor.type]}参数
      </h4>
      <div className="col-span-full grid grid-cols-2 gap-2">
        <Field label="名称">
          <TextField value={sensor.name} onCommit={(name) => name.trim() && patch({ name })} />
        </Field>
        <Field label="id">
          <TextField value={id} onCommit={(next) => run(() => renameSensor(id, next))} />
        </Field>
      </div>
      <Field label="频率 Hz">
        <NumberField
          value={sensor.frequency}
          min={0.1}
          max={1000}
          onCommit={(frequency) => patch({ frequency })}
        />
      </Field>
      <p className="col-span-2 self-end pb-1.5 text-[11px] leading-4 text-fg-3">
        位姿：车辆坐标系，原点为后轴中心，x 前、y 左、z 上
      </p>
      {POSE_FIELDS.map(([key, label]) => (
        <Field key={key} label={label}>
          <NumberField value={sensor.pose[key]} onCommit={(v) => patchPose(key, v)} />
        </Field>
      ))}
      {sensor.type === 'camera' && <CameraFields id={id} camera={sensor.camera} run={run} />}
      {sensor.type === 'lidar' && <LidarFields id={id} lidar={sensor.lidar} run={run} />}
      {sensor.type === 'radar' && <RadarFields id={id} radar={sensor.radar} run={run} />}
    </section>
  )
}

/**
 * 相机参数：分辨率、FOV、模型、内参、畸变；支持导入标定与按 FOV 重算内参
 * @param props.id - 传感器 id
 * @param props.camera - 相机参数
 * @param props.run - 统一处理异常
 */
const CameraFields = ({
  id,
  camera,
  run,
}: {
  id: string
  camera: CameraParams
  run: (fn: () => void) => void
}) => {
  const { message } = App.useApp()
  const fileRef = useRef<HTMLInputElement>(null)
  /** 修改相机参数（未标定时 FOV / 分辨率变化会重算内参） */
  const patch = (fields: Partial<CameraParams>, label?: string) =>
    run(() =>
      updateSensor(
        id,
        (s) => (s.type === 'camera' ? { ...s, camera: updateCamera(s.camera, fields) } : s),
        label,
      ),
    )
  const k = camera.intrinsics

  return (
    <>
      <div className="col-span-full mt-1 flex items-center gap-2">
        <span className="text-xs font-medium text-fg-3">成像</span>
        {camera.calibrated ? (
          <Tag color="green" variant="filled" className="me-0!">
            已标定
          </Tag>
        ) : (
          <Tag variant="filled" className="me-0!">
            内参由 FOV 推算
          </Tag>
        )}
        <span className="ms-auto flex gap-1">
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              void file.text().then((text) =>
                run(() => {
                  importCameraCalibration(id, text)
                  message.success(`已导入标定「${file.name}」`)
                }),
              )
            }}
          />
          <Tooltip title="导入标定 JSON：本格式的 camera 对象，或 OpenCV 风格的 camera_matrix / K 与 dist_coeffs / D">
            <Button
              size="small"
              icon={<FileUp size={13} strokeWidth={1.75} />}
              onClick={() => fileRef.current?.click()}
            >
              导入标定
            </Button>
          </Tooltip>
          <Tooltip title="按 FOV 与分辨率重算内参，并清除标定标记">
            <Button
              size="small"
              aria-label="按 FOV 重算内参"
              icon={<RefreshCw size={13} strokeWidth={1.75} />}
              onClick={() =>
                patch(
                  {
                    calibrated: false,
                    intrinsics: intrinsicsFromFov(camera.fov, camera.width, camera.height),
                    fov: camera.fov,
                  },
                  '按 FOV 重算内参',
                )
              }
            />
          </Tooltip>
        </span>
      </div>
      <Field label="宽 px">
        <NumberField
          value={camera.width}
          min={1}
          precision={0}
          onCommit={(width) => patch({ width })}
        />
      </Field>
      <Field label="高 px">
        <NumberField
          value={camera.height}
          min={1}
          precision={0}
          onCommit={(height) => patch({ height })}
        />
      </Field>
      <Field label="水平 FOV °">
        <NumberField value={camera.fov} min={1} max={360} onCommit={(fov) => patch({ fov })} />
      </Field>
      <Field label="模型" wide>
        <Select
          size="small"
          value={camera.model}
          options={[
            { value: 'pinhole', label: '针孔 pinhole' },
            { value: 'fisheye', label: '鱼眼 fisheye' },
          ]}
          onChange={(model) => patch({ model })}
        />
      </Field>
      {(['fx', 'fy', 'cx', 'cy'] as const).map((key) => (
        <Field key={key} label={key}>
          <NumberField
            value={k[key]}
            onCommit={(v) => patch({ intrinsics: { ...k, [key]: v }, calibrated: true })}
          />
        </Field>
      ))}
      <div className="col-span-full">
        <Field label={camera.model === 'fisheye' ? '畸变 k1 k2 k3 k4' : '畸变 k1 k2 p1 p2 k3'} wide>
          <TextField
            value={camera.distortion.join(', ')}
            placeholder="逗号分隔"
            onCommit={(text) => {
              const values = text
                .split(/[\s,，]+/)
                .filter(Boolean)
                .map(Number)
              if (values.some((v) => !Number.isFinite(v))) {
                run(() => {
                  throw new Error('畸变系数应为逗号分隔的数值')
                })
                return
              }
              patch({ distortion: values })
            }}
          />
        </Field>
      </div>
    </>
  )
}

/**
 * 激光雷达参数
 * @param props.id - 传感器 id
 * @param props.lidar - 激光雷达参数
 * @param props.run - 统一处理异常
 */
const LidarFields = ({
  id,
  lidar,
  run,
}: {
  id: string
  lidar: LidarParams
  run: (fn: () => void) => void
}) => {
  /** 修改激光雷达参数 */
  const patch = (fields: Partial<LidarParams>) =>
    run(() =>
      updateSensor(id, (s) =>
        s.type === 'lidar' ? { ...s, lidar: { ...s.lidar, ...fields } } : s,
      ),
    )
  const [low, high] = lidar.verticalFov
  return (
    <>
      <Field label="线数">
        <NumberField
          value={lidar.channels}
          min={1}
          precision={0}
          onCommit={(channels) => patch({ channels })}
        />
      </Field>
      <Field label="量程 m">
        <NumberField value={lidar.range} min={0.1} onCommit={(range) => patch({ range })} />
      </Field>
      <Field label="转速 Hz">
        <NumberField
          value={lidar.rotationFrequency}
          min={0.1}
          onCommit={(rotationFrequency) => patch({ rotationFrequency })}
        />
      </Field>
      <Field label="水平 FOV °">
        <NumberField
          value={lidar.horizontalFov}
          min={1}
          max={360}
          onCommit={(horizontalFov) => patch({ horizontalFov })}
        />
      </Field>
      <Field label="垂直下限 °">
        <NumberField
          value={low}
          max={high - 0.1}
          onCommit={(v) => patch({ verticalFov: [v, high] })}
        />
      </Field>
      <Field label="垂直上限 °">
        <NumberField
          value={high}
          min={low + 0.1}
          onCommit={(v) => patch({ verticalFov: [low, v] })}
        />
      </Field>
    </>
  )
}

/**
 * 毫米波雷达参数
 * @param props.id - 传感器 id
 * @param props.radar - 雷达参数
 * @param props.run - 统一处理异常
 */
const RadarFields = ({
  id,
  radar,
  run,
}: {
  id: string
  radar: RadarParams
  run: (fn: () => void) => void
}) => {
  /** 修改雷达参数 */
  const patch = (fields: Partial<RadarParams>) =>
    run(() =>
      updateSensor(id, (s) =>
        s.type === 'radar' ? { ...s, radar: { ...s.radar, ...fields } } : s,
      ),
    )
  return (
    <>
      <Field label="探测距离 m">
        <NumberField value={radar.range} min={0.1} onCommit={(range) => patch({ range })} />
      </Field>
      <Field label="水平 FOV °">
        <NumberField
          value={radar.horizontalFov}
          min={1}
          max={360}
          onCommit={(horizontalFov) => patch({ horizontalFov })}
        />
      </Field>
      <Field label="垂直 FOV °">
        <NumberField
          value={radar.verticalFov}
          min={1}
          max={180}
          onCommit={(verticalFov) => patch({ verticalFov })}
        />
      </Field>
      <Field label="频率 GHz">
        <NumberField
          value={radar.frequencyGHz}
          min={1}
          onCommit={(frequencyGHz) => patch({ frequencyGHz })}
        />
      </Field>
    </>
  )
}
