import { beforeEach, describe, expect, it } from 'vitest'
import type { EntityDraft } from '../core/openscenario/edit'
import {
  addEntity,
  createEmptyScenario,
  removeEntity,
  renameEntity,
} from '../core/openscenario/edit'
import {
  getEgoNames,
  getSensorFileRef,
  setEgo,
  setSensorFileRef,
} from '../core/openscenario/edit-ego'
import { parseOpenScenario } from '../core/openscenario/parse'
import { serializeSensorConfig } from '../core/sensors/schema'
import { validateScene } from '../core/validate'
import { parseXml, serializeXml } from '../core/xml'
import { useSceneEditorStore } from '../stores/scene-editor-store'
import { addSensor, addSensorKit, removeSensor, setEgoVehicle, updateSensor } from './ego-actions'

const CAR: EntityDraft = {
  name: '轿车1',
  kind: 'vehicle',
  category: 'car',
  length: 4.6,
  width: 1.8,
  height: 1.5,
}
const at = (x: number) => ({ kind: 'world' as const, x, y: 0, h: 0 })

/**
 * 含两辆车和一个行人的场景
 * @returns 文档
 */
const twoCars = () => {
  let doc = createEmptyScenario({ logicFile: 'r.xodr' }).doc
  doc = addEntity(doc, CAR, at(0))
  doc = addEntity(doc, { ...CAR, name: '轿车2' }, at(20))
  return addEntity(
    doc,
    { ...CAR, name: '行人1', kind: 'pedestrian', category: 'pedestrian' },
    at(5),
  )
}

const store = () => useSceneEditorStore.getState()

describe('自车标记（xosc）', () => {
  it('写入 CARLA 约定的属性，并保持唯一', () => {
    const doc = setEgo(twoCars(), '轿车1')
    expect(getEgoNames(doc)).toEqual(['轿车1'])
    expect(serializeXml({ doc, declaration: '' })).toContain(
      '<Property name="type" value="ego_vehicle"/>',
    )
    const moved = setEgo(doc, '轿车2')
    expect(getEgoNames(moved)).toEqual(['轿车2'])
    expect(parseOpenScenario(moved).entities.find((e) => e.ego)?.name).toBe('轿车2')
    expect(getEgoNames(setEgo(moved, undefined))).toEqual([])
  })

  it('传感器文件引用随自车迁移', () => {
    let doc = setSensorFileRef(setEgo(twoCars(), '轿车1'), 'scene.sensors.json')
    expect(parseOpenScenario(doc).sensorFile).toBe('scene.sensors.json')
    doc = setEgo(doc, '轿车2')
    expect(getSensorFileRef(doc)).toBe('scene.sensors.json')
    // 旧自车上不再保留引用
    expect(serializeXml({ doc, declaration: '' }).match(/sensors\.json/g)).toHaveLength(1)
    expect(getSensorFileRef(setSensorFileRef(doc, undefined))).toBeUndefined()
  })

  it('改名后仍是自车；删除后不再有自车', () => {
    const doc = setEgo(twoCars(), '轿车1')
    expect(getEgoNames(renameEntity(doc, '轿车1', '自车'))).toEqual(['自车'])
    expect(getEgoNames(removeEntity(doc, '轿车1').doc)).toEqual([])
  })

  it('行人或目录引用不能设为自车', () => {
    expect(() => setEgo(twoCars(), '行人1')).toThrow('不是车辆')
    const withRef = parseXml(`<OpenSCENARIO><FileHeader revMajor="1" revMinor="2"/>
  <Entities><ScenarioObject name="Ego"><CatalogReference catalogName="VehicleCatalog" entryName="car"/></ScenarioObject></Entities>
  <Storyboard><Init><Actions/></Init><StopTrigger/></Storyboard></OpenSCENARIO>`).doc
    expect(() => setEgo(withRef, 'Ego')).toThrow('目录引用')
  })
})

describe('传感器编辑动作与撤销', () => {
  beforeEach(() => {
    store().reset()
    store().load('xosc', { doc: twoCars(), declaration: '' }, 'demo.xosc')
  })

  it('未指定自车时不能添加传感器', () => {
    expect(() => addSensor('cam-front')).toThrow('请先指定自车')
  })

  it('首次添加传感器时创建配置并写入引用，一步撤销', () => {
    setEgoVehicle('轿车1')
    addSensorKit()
    expect(store().sensors?.fileName).toBe('demo.sensors.json')
    expect(store().sensors?.config.sensors.map((s) => s.id)).toEqual([
      'cam_front',
      'lidar_top',
      'radar_front',
    ])
    expect(getSensorFileRef(store().xosc?.doc as XMLDocument)).toBe('demo.sensors.json')

    const id = addSensor('cam-front')
    expect(id).toBe('cam_front_2')
    expect(store().selectedSensor).toBe('cam_front_2')
    updateSensor('cam_front_2', (s) => ({ ...s, pose: { ...s.pose, yaw: 30 } }))
    expect(store().sensors?.config.sensors[3].pose.yaw).toBe(30)

    store().undo() // 改位姿
    store().undo() // 添加
    expect(store().sensors?.config.sensors).toHaveLength(3)
    expect(store().selectedSensor).toBeUndefined()
    store().undo() // 默认套件 + 引用
    expect(store().sensors).toBeUndefined()
    expect(getSensorFileRef(store().xosc?.doc as XMLDocument)).toBeUndefined()
    store().redo()
    expect(store().sensors?.config.sensors).toHaveLength(3)

    removeSensor('lidar_top')
    expect(store().sensors?.config.sensors.map((s) => s.id)).toEqual(['cam_front', 'radar_front'])
  })

  it('文本替换：合法时生效，不合法时报错且不改动', () => {
    setEgoVehicle('轿车1')
    addSensorKit()
    const before = store().sensors
    expect(() => store().replaceText('sensors', '{"format":"wmdg-sensor-config"}')).toThrow()
    expect(store().sensors).toBe(before)
    const config = { ...before!.config, sensors: before!.config.sensors.slice(0, 1) }
    store().replaceText('sensors', serializeSensorConfig(config))
    expect(store().sensors?.config.sensors).toHaveLength(1)
    expect(store().sensors?.fileName).toBe('demo.sensors.json')
  })

  it('校验：自车与传感器', () => {
    const issues = () =>
      validateScene({
        scenario: parseOpenScenario(store().xosc?.doc as XMLDocument),
        doc: store().xosc?.doc,
        sensors: store().sensors?.config,
      }).map((i) => i.message)
    expect(issues().some((m) => m.includes('未指定自车'))).toBe(true)
    setEgoVehicle('轿车1')
    addSensor('cam-front')
    updateSensor('cam_front', (s) => ({ ...s, pose: { ...s.pose, x: 20 } }))
    expect(issues().some((m) => m.includes('安装点距车身'))).toBe(true)
    // 引用了传感器文件但没有加载
    store().commitSensors(undefined, '移除传感器配置')
    expect(issues().some((m) => m.includes('未加载该文件'))).toBe(true)
  })
})
