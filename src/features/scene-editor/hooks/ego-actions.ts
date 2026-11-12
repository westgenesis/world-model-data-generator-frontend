/**
 * 自车与传感器的编辑动作：自车标记写在 xosc，传感器配置是独立的 JSON 文档，
 * 两者的联动（文件引用）在这里统一处理，并作为一步撤销提交。
 */
import {
  getEgoNames,
  getSensorFileRef,
  setEgo,
  setSensorFileRef,
} from '../core/openscenario/edit-ego'
import { importCalibration } from '../core/sensors/camera'
import { createSensor, DEFAULT_SENSOR_KIT } from '../core/sensors/presets'
import { emptySensorConfig } from '../core/sensors/schema'
import type { Sensor, SensorConfig } from '../core/sensors/types'
import { useSceneEditorStore } from '../stores/scene-editor-store'

const store = () => useSceneEditorStore.getState()

/**
 * 传感器配置的默认文件名：与场景同名，扩展名为 .sensors.json
 * @returns 文件名
 */
const defaultSensorFileName = () => `${store().xoscName.replace(/\.xosc$/i, '')}.sensors.json`

/**
 * 指定自车（或取消）。已有传感器配置时，文件引用随自车迁移；引用丢失时补写
 * @param name - 实体名；undefined 表示取消自车
 * @throws {Error} 实体不是内联车辆时抛出
 */
export const setEgoVehicle = (name: string | undefined) => {
  const { xosc, sensors } = store()
  if (!xosc) return
  let doc = setEgo(xosc.doc, name)
  if (name && sensors && !getSensorFileRef(doc)) {
    doc = setSensorFileRef(doc, sensors.fileName, false)
  }
  store().commit('xosc', doc, name ? `设「${name}」为自车` : '取消自车')
}

/**
 * 修改传感器配置并提交；没有配置时先创建，并在 xosc 自车上写入文件引用
 * @param mutate - 由旧配置得到新配置
 * @param label - 撤销记录名
 * @throws {Error} 未指定自车时抛出
 */
const commitConfig = (mutate: (config: SensorConfig) => SensorConfig, label: string) => {
  const { xosc, sensors } = store()
  if (!xosc || getEgoNames(xosc.doc).length === 0) throw new Error('请先指定自车')
  const fileName = sensors?.fileName ?? defaultSensorFileName()
  const config = mutate(sensors?.config ?? emptySensorConfig())
  const xoscDoc = getSensorFileRef(xosc.doc) ? undefined : setSensorFileRef(xosc.doc, fileName)
  store().commitSensors({ config, fileName }, label, xoscDoc)
}

/**
 * 按预设添加传感器，并选中它
 * @param presetId - 预设 id
 * @returns 新传感器 id
 */
export const addSensor = (presetId: string) => {
  let id: string | undefined
  commitConfig((config) => {
    const sensor = createSensor(
      presetId,
      config.sensors.map((s) => s.id),
    )
    if (!sensor) throw new Error(`未知的传感器预设：${presetId}`)
    id = sensor.id
    return { ...config, sensors: [...config.sensors, sensor] }
  }, '添加传感器')
  store().setUi({ selectedSensor: id })
  return id
}

/** 添加默认套件：前视主相机 + 主激光雷达 + 前向毫米波雷达 */
export const addSensorKit = () =>
  commitConfig((config) => {
    const sensors = [...config.sensors]
    for (const presetId of DEFAULT_SENSOR_KIT) {
      const sensor = createSensor(
        presetId,
        sensors.map((s) => s.id),
      )
      if (sensor) sensors.push(sensor)
    }
    return { ...config, sensors }
  }, '添加默认传感器套件')

/**
 * 修改传感器
 * @param id - 传感器 id
 * @param update - 由旧传感器得到新传感器
 * @param label - 撤销记录名
 */
export const updateSensor = (
  id: string,
  update: (sensor: Sensor) => Sensor,
  label = '修改传感器',
) =>
  commitConfig(
    (config) => ({
      ...config,
      sensors: config.sensors.map((s) => (s.id === id ? update(s) : s)),
    }),
    label,
  )

/**
 * 修改传感器 id（同步选中状态）
 * @param id - 原 id
 * @param next - 新 id
 * @throws {Error} 新 id 为空或已存在时抛出
 */
export const renameSensor = (id: string, next: string) => {
  const trimmed = next.trim()
  if (!trimmed || trimmed === id) return
  if (store().sensors?.config.sensors.some((s) => s.id === trimmed)) {
    throw new Error(`传感器 id「${trimmed}」已存在`)
  }
  updateSensor(id, (s) => ({ ...s, id: trimmed }), '修改传感器 id')
  store().setUi({ selectedSensor: trimmed })
}

/**
 * 删除传感器
 * @param id - 传感器 id
 */
export const removeSensor = (id: string) => {
  commitConfig(
    (config) => ({ ...config, sensors: config.sensors.filter((s) => s.id !== id) }),
    '删除传感器',
  )
  if (store().selectedSensor === id) store().setUi({ selectedSensor: undefined })
}

/**
 * 导入相机标定文件（JSON）
 * @param id - 相机 id
 * @param text - 标定文件内容
 * @throws {Error} 不是相机或无法识别内参时抛出
 */
export const importCameraCalibration = (id: string, text: string) => {
  const sensor = store().sensors?.config.sensors.find((s) => s.id === id)
  if (sensor?.type !== 'camera') throw new Error('只有相机可以导入标定')
  const camera = importCalibration(text, sensor.camera)
  updateSensor(id, (s) => (s.type === 'camera' ? { ...s, camera } : s), '导入相机标定')
}
