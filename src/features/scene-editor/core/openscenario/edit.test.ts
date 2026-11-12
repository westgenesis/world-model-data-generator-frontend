import { describe, expect, it } from 'vitest'
import { buildNetworkMesh } from '../opendrive/lanes'
import { parseOpenDrive } from '../opendrive/parse'
import { isOnRoad, projectToLane } from '../opendrive/project'
import { parseXml, serializeXml } from '../xml'
import type { EntityDraft } from './edit'
import {
  addEntity,
  catalogToInline,
  createEmptyScenario,
  findEntityReferences,
  getStopTime,
  removeEntity,
  renameEntity,
  setEntityProps,
  setInitSpeed,
  setKeyframes,
  setLogicFile,
  setStopTime,
  uniqueName,
  withHeadings,
} from './edit'
import { buildMotions, poseAt, segmentSpeeds, snapToFrame } from './motion'
import { parseOpenScenario } from './parse'
import { resolveInitPoses } from './resolve'

const CAR: EntityDraft = {
  name: 'Car1',
  kind: 'vehicle',
  category: 'car',
  length: 4.6,
  width: 1.8,
  height: 1.5,
}
const PED: EntityDraft = {
  name: 'Ped1',
  kind: 'pedestrian',
  category: 'pedestrian',
  length: 0.5,
  width: 0.5,
  height: 1.7,
}

const XODR = `<OpenDRIVE><header revMajor="1" revMinor="6"/>
  <road id="1" length="100" junction="-1">
    <planView><geometry s="0" x="0" y="0" hdg="0" length="100"><line/></geometry></planView>
    <lanes><laneSection s="0">
      <left><lane id="1" type="driving"><width sOffset="0" a="3.5" b="0" c="0" d="0"/></lane></left>
      <center><lane id="0" type="none"/></center>
      <right><lane id="-1" type="driving"><width sOffset="0" a="3.5" b="0" c="0" d="0"/></lane></right>
    </laneSection></lanes>
  </road>
</OpenDRIVE>`
const network = parseOpenDrive(parseXml(XODR).doc)
const mesh = buildNetworkMesh(network, 1)

/** 解析文档并给出实体初始位姿与运动 */
const read = (doc: XMLDocument) => {
  const scenario = parseOpenScenario(doc)
  const poses = resolveInitPoses(scenario, network)
  return { scenario, poses, motions: buildMotions(scenario, network, poses) }
}

describe('createEmptyScenario / addEntity', () => {
  it('新建场景并添加内联车辆、行人', () => {
    const empty = createEmptyScenario({ logicFile: 'road.xodr', stopTime: 15 })
    expect(getStopTime(empty.doc)).toBe(15)
    let doc = addEntity(empty.doc, CAR, { kind: 'world', x: 10, y: -1.75, h: 0 }, 8)
    doc = addEntity(doc, PED, { kind: 'lane', roadId: '1', laneId: 1, s: 30, offset: 0 })

    const { scenario, poses } = read(doc)
    expect(scenario.logicFile).toBe('road.xodr')
    expect(scenario.entities.map((e) => [e.name, e.kind, e.category, e.length, e.height])).toEqual([
      ['Car1', 'vehicle', 'car', 4.6, 1.5],
      ['Ped1', 'pedestrian', 'pedestrian', 0.5, 1.7],
    ])
    expect(scenario.initSpeeds.get('Car1')).toBe(8)
    expect(poses.get('Car1')).toMatchObject({ x: 10, y: -1.75 })
    expect(poses.get('Ped1')).toMatchObject({ x: 30, y: 1.75 })
    // 原文档不变
    expect(parseOpenScenario(empty.doc).entities).toHaveLength(0)
  })

  it('新插入的节点按文件缩进排版', () => {
    const doc = addEntity(createEmptyScenario({ logicFile: 'r.xodr' }).doc, CAR, {
      kind: 'world',
      x: 0,
      y: 0,
      h: 0,
    })
    const text = serializeXml({ doc, declaration: '' })
    expect(text).toContain('\n  <Entities>\n    <ScenarioObject name="Car1">\n      <Vehicle')
    expect(text).toContain('<Dimensions width="1.8" length="4.6" height="1.5"/>')
  })

  it('实体名重复时报错', () => {
    const doc = addEntity(createEmptyScenario({ logicFile: 'r.xodr' }).doc, CAR, {
      kind: 'world',
      x: 0,
      y: 0,
      h: 0,
    })
    expect(() => addEntity(doc, CAR, { kind: 'world', x: 0, y: 0, h: 0 })).toThrow('已存在')
    expect(uniqueName(['Car1', 'Car2'], 'Car')).toBe('Car3')
  })
})

describe('setKeyframes / motion', () => {
  const base = addEntity(createEmptyScenario({ logicFile: 'r.xodr' }).doc, CAR, {
    kind: 'world',
    x: 0,
    y: -1.75,
    h: 0,
  })
  const kfs = [
    { t: 0, x: 0, y: -1.75 },
    { t: 4, x: 40, y: -1.75 },
    { t: 6, x: 50, y: 1.75 },
  ]

  it('创建编辑器管理的 FollowTrajectoryAction 并能读回关键帧', () => {
    const doc = setKeyframes(base, 'Car1', kfs)
    const text = serializeXml({ doc, declaration: '' })
    expect(text).toContain('<Story name="WMDG_EditorStory">')
    expect(text).toContain('<TrajectoryRef>')
    expect(text).toContain('domainAbsoluteRelative="absolute"')
    expect(text).toContain('rule="greaterOrEqual"')
    // Story 位于 StopTrigger 之前
    expect(text.indexOf('<Story ')).toBeLessThan(text.indexOf('<StopTrigger>'))

    const motion = read(doc).motions.get('Car1')
    expect(motion?.managed).toBe(true)
    expect(motion?.keyframes.map((k) => [k.t, k.x, k.y])).toEqual(kfs.map((k) => [k.t, k.x, k.y]))
    expect(motion?.keyframes[0].h).toBeCloseTo(0)
    expect(motion?.keyframes[1].h).toBeCloseTo(Math.atan2(3.5, 10))
  })

  it('再次设置时原地改写，不重复创建；清空后删除编辑器 Story', () => {
    const once = setKeyframes(base, 'Car1', kfs)
    const twice = setKeyframes(once, 'Car1', [...kfs, { t: 8, x: 70, y: 1.75 }])
    expect(twice.getElementsByTagName('ManeuverGroup')).toHaveLength(1)
    expect(read(twice).motions.get('Car1')?.keyframes).toHaveLength(4)

    const cleared = setKeyframes(twice, 'Car1', [])
    expect(cleared.getElementsByTagName('Story')).toHaveLength(0)
  })

  it('首帧同步为初始位置', () => {
    const doc = setKeyframes(base, 'Car1', [
      { t: 0, x: 5, y: 1.75 },
      { t: 2, x: 15, y: 1.75 },
    ])
    expect(read(doc).poses.get('Car1')).toMatchObject({ x: 5, y: 1.75 })
  })

  it('poseAt 线性插值，首尾保持；段速度与突变标记', () => {
    const k = withHeadings(kfs)
    expect(poseAt(k, -1)).toMatchObject({ x: 0, y: -1.75 })
    expect(poseAt(k, 2)).toMatchObject({ x: 20, y: -1.75 })
    expect(poseAt(k, 99)).toMatchObject({ x: 50, y: 1.75 })
    const speeds = segmentSpeeds(kfs)
    expect(speeds[0]).toEqual({ speed: 10, jump: false })
    expect(speeds[1].speed).toBeCloseTo(Math.hypot(10, 3.5) / 2)
    expect(speeds[1].jump).toBe(true)
    expect(snapToFrame(1.234, 10)).toBeCloseTo(1.2)
  })

  it('改写导入场景中已有的折线轨迹，保留其他内容', () => {
    const imported = parseXml(`<OpenSCENARIO><FileHeader revMajor="1" revMinor="0"/>
  <Entities><ScenarioObject name="Car1"><CatalogReference catalogName="VehicleCatalog" entryName="car_red"/></ScenarioObject></Entities>
  <Storyboard>
    <Init><Actions><Private entityRef="Car1"><PrivateAction><TeleportAction><Position><LanePosition roadId="1" laneId="-1" offset="0" s="0"/></Position></TeleportAction></PrivateAction></Private></Actions></Init>
    <Story name="Imported"><Act name="A"><ManeuverGroup maximumExecutionCount="1" name="G">
      <Actors selectTriggeringEntities="false"><EntityRef entityRef="Car1"/></Actors>
      <Maneuver name="M"><Event name="E" priority="overwrite"><Action name="Act"><PrivateAction><RoutingAction><FollowTrajectoryAction>
        <Trajectory name="T" closed="false"><Shape><Polyline>
          <Vertex time="0"><Position><WorldPosition x="0" y="-1.75"/></Position></Vertex>
          <Vertex time="5"><Position><WorldPosition x="30" y="-1.75"/></Position></Vertex>
        </Polyline></Shape></Trajectory>
        <TimeReference><None/></TimeReference>
        <TrajectoryFollowingMode followingMode="position"/>
      </FollowTrajectoryAction></RoutingAction></PrivateAction></Action>
      <StartTrigger><ConditionGroup><Condition name="c" delay="0" conditionEdge="rising"><ByValueCondition><SimulationTimeCondition value="2" rule="greaterThan"/></ByValueCondition></Condition></ConditionGroup></StartTrigger>
      </Event></Maneuver></ManeuverGroup>
      <StartTrigger/></Act></Story>
    <StopTrigger/>
  </Storyboard>
</OpenSCENARIO>`).doc
    const before = read(imported).motions.get('Car1')
    expect(before).toMatchObject({ trajectoryIndex: 0, managed: false })
    expect(before?.notice).toContain('条件触发')

    const doc = setKeyframes(
      imported,
      'Car1',
      [...(before?.keyframes ?? []), { t: 8, x: 50, y: -1.75 }],
      { trajectoryIndex: 0, syncInit: false },
    )
    const text = serializeXml({ doc, declaration: '' })
    expect(doc.getElementsByTagName('Story')).toHaveLength(1)
    expect(text).toContain('<Vertex time="8">')
    expect(text).toContain('<Timing domainAbsoluteRelative="absolute" scale="1" offset="0"/>')
    // 未要求同步时保留原有的 LanePosition 初始位置
    expect(text).toContain('<LanePosition roadId="1" laneId="-1" offset="0" s="0"/>')
    expect(read(doc).motions.get('Car1')?.keyframes).toHaveLength(3)
  })
})

describe('实体属性、重命名与删除', () => {
  const doc = setKeyframes(
    addEntity(
      addEntity(createEmptyScenario({ logicFile: 'r.xodr' }).doc, CAR, {
        kind: 'world',
        x: 0,
        y: 0,
        h: 0,
      }),
      { ...CAR, name: 'Lead' },
      { kind: 'world', x: 20, y: 0, h: 0 },
    ),
    'Car1',
    [
      { t: 0, x: 0, y: 0 },
      { t: 3, x: 30, y: 0 },
    ],
  )

  it('修改类别与尺寸', () => {
    const next = setEntityProps(doc, 'Car1', { category: 'truck', length: 8, height: 3.2 })
    const e = parseOpenScenario(next).entities[0]
    expect(e).toMatchObject({ category: 'truck', length: 8, width: 1.8, height: 3.2 })
    expect(e.centerX).toBeCloseTo(2.4)
  })

  it('重命名同步引用与编辑器元素名', () => {
    const next = renameEntity(doc, 'Car1', 'Ego')
    const text = serializeXml({ doc: next, declaration: '' })
    expect(text).not.toContain('Car1')
    expect(text).toContain('<ManeuverGroup maximumExecutionCount="1" name="WMDG_Ego">')
    expect(text).toContain('<EntityRef entityRef="Ego"/>')
    expect(read(next).motions.get('Ego')?.keyframes).toHaveLength(2)
    expect(() => renameEntity(doc, 'Car1', 'Lead')).toThrow('已存在')
  })

  it('重命名同步通过参数间接引用的实体', () => {
    const withParam = parseXml(`<OpenSCENARIO><FileHeader revMajor="1" revMinor="1"/>
  <ParameterDeclarations><ParameterDeclaration name="owner" parameterType="string" value="Car1"/>
    <ParameterDeclaration name="label" parameterType="string" value="Car1"/></ParameterDeclarations>
  <Entities><ScenarioObject name="Car1"><CatalogReference catalogName="V" entryName="car"/></ScenarioObject></Entities>
  <Storyboard><Init><Actions/></Init><Story name="S"><Act name="A"><ManeuverGroup maximumExecutionCount="1" name="G">
    <Actors selectTriggeringEntities="false"><EntityRef entityRef="$owner"/></Actors></ManeuverGroup></Act></Story><StopTrigger/></Storyboard>
</OpenSCENARIO>`).doc
    const text = serializeXml({ doc: renameEntity(withParam, 'Car1', 'Ego'), declaration: '' })
    expect(text).toContain('name="owner" parameterType="string" value="Ego"')
    // 与实体引用无关的同值参数不改
    expect(text).toContain('name="label" parameterType="string" value="Car1"')
  })

  it('删除实体时一并删除 Init 与编辑器轨迹，并报告残留引用', () => {
    const { doc: next, danglingRefs } = removeEntity(doc, 'Car1')
    expect(parseOpenScenario(next).entities.map((e) => e.name)).toEqual(['Lead'])
    expect(next.getElementsByTagName('Story')).toHaveLength(0)
    expect(danglingRefs).toBe(0)
    expect(findEntityReferences(next, 'Lead')).toHaveLength(1)
  })

  it('初始速度、时长与 LogicFile', () => {
    let next = setInitSpeed(doc, 'Lead', 12)
    next = setInitSpeed(next, 'Lead', 15)
    expect(next.getElementsByTagName('AbsoluteTargetSpeed')).toHaveLength(1)
    expect(parseOpenScenario(next).initSpeeds.get('Lead')).toBe(15)
    expect(getStopTime(setStopTime(next, 30))).toBe(30)
    expect(parseOpenScenario(setLogicFile(next, '../xodr/x.xodr')).logicFile).toBe('../xodr/x.xodr')
  })

  it('目录引用转内联定义', () => {
    const withRef = parseXml(`<OpenSCENARIO><FileHeader revMajor="1" revMinor="1"/>
  <Entities><ScenarioObject name="Ego"><CatalogReference catalogName="VehicleCatalog" entryName="car_white"/></ScenarioObject></Entities>
  <Storyboard><Init><Actions/></Init><StopTrigger/></Storyboard></OpenSCENARIO>`).doc
    const next = catalogToInline(withRef, { ...CAR, name: 'Ego' })
    const e = parseOpenScenario(next).entities[0]
    expect(e.catalog).toBeUndefined()
    expect(e).toMatchObject({ kind: 'vehicle', length: 4.6 })
  })
})

describe('projectToLane / isOnRoad', () => {
  it('投影到最近的车道中心，左侧车道朝向反向', () => {
    const right = projectToLane(mesh, network, 42.3, -1)
    expect(right).toMatchObject({ roadId: '1', laneId: -1 })
    expect(right?.s).toBeCloseTo(42.3)
    expect(right?.y).toBeCloseTo(-1.75)
    expect(right?.hdg).toBeCloseTo(0)
    expect(projectToLane(mesh, network, 10, 3)?.hdg).toBeCloseTo(Math.PI)
  })

  it('判断是否在路面上', () => {
    expect(isOnRoad(mesh, 50, -3)).toBe(true)
    expect(isOnRoad(mesh, 50, -8)).toBe(false)
  })
})

describe('角色（OpenSCENARIO 1.2）', () => {
  const header = (doc: XMLDocument) =>
    doc.getElementsByTagName('FileHeader')[0].getAttribute('revMinor')
  const v11 = () =>
    parseXml(`<OpenSCENARIO><FileHeader revMajor="1" revMinor="1"/>
  <Entities/><Storyboard><Init><Actions/></Init><StopTrigger/></Storyboard></OpenSCENARIO>`).doc
  const pose = { kind: 'world', x: 0, y: 0, h: 0 } as const

  it('新建场景为 1.2', () => {
    expect(header(createEmptyScenario({ logicFile: 'r.xodr' }).doc)).toBe('2')
  })

  it('添加角色车辆时写入 role、maxSpeed，并把旧版本场景升级到 1.2', () => {
    const doc = v11()
    const next = addEntity(doc, { ...CAR, name: 'Police', role: 'police', maxSpeed: 30 }, pose)
    const vehicle = next.getElementsByTagName('Vehicle')[0]
    expect(vehicle.getAttribute('role')).toBe('police')
    expect(next.getElementsByTagName('Performance')[0].getAttribute('maxSpeed')).toBe('30')
    expect(header(next)).toBe('2')
    expect(header(doc)).toBe('1')
    expect(parseOpenScenario(next).entities[0].role).toBe('police')
  })

  it('不带角色的实体不改变版本；静态物体忽略角色', () => {
    expect(header(addEntity(v11(), CAR, pose))).toBe('1')
    const cone: EntityDraft = {
      ...CAR,
      name: 'Cone',
      kind: 'misc',
      category: 'obstacle',
      role: 'police',
    }
    const next = addEntity(v11(), cone, pose)
    expect(next.getElementsByTagName('MiscObject')[0].hasAttribute('role')).toBe(false)
    expect(header(next)).toBe('1')
  })

  it('修改与清除角色', () => {
    const doc = addEntity(v11(), CAR, pose)
    const withRole = setEntityProps(doc, 'Car1', { role: 'ambulance' })
    expect(parseOpenScenario(withRole).entities[0].role).toBe('ambulance')
    expect(header(withRole)).toBe('2')
    const cleared = setEntityProps(withRole, 'Car1', { role: '' })
    expect(parseOpenScenario(cleared).entities[0].role).toBeUndefined()
    expect(cleared.getElementsByTagName('Vehicle')[0].hasAttribute('role')).toBe(false)
  })
})
