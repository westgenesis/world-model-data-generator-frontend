import { describe, expect, it } from 'vitest'
import { parseOpenDrive } from '../opendrive/parse'
import { parseXml } from '../xml'
import { resolveString } from './expression'
import { parseOpenScenario } from './parse'
import { resolveInitPoses } from './resolve'

describe('resolveString', () => {
  const params = new Map([
    ['speed', '108'],
    ['name', 'car_red'],
  ])

  it('解析参数引用、表达式与字面量', () => {
    expect(resolveString('$name', params)).toBe('car_red')
    expect(resolveString('${$speed / 3.6}', params)).toBe('30')
    expect(resolveString('${-(2 + 3) * 4 % 7}', params)).toBe(String(-(20 % 7)))
    expect(resolveString('12.5', params)).toBe('12.5')
  })

  it('不支持的语法与未知参数返回 undefined', () => {
    expect(resolveString('${sqrt(4)}', params)).toBeUndefined()
    expect(resolveString('${$missing + 1}', params)).toBeUndefined()
    expect(resolveString('$missing', params)).toBeUndefined()
  })
})

/** 100 m 直路，右侧 1 车道（宽 3.5），左侧 1 车道（宽 3.5） */
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

const XOSC = `<OpenSCENARIO>
  <FileHeader revMajor="1" revMinor="1" description="测试场景"/>
  <ParameterDeclarations>
    <ParameterDeclaration name="EgoS" parameterType="double" value="20"/>
    <ParameterDeclaration name="Speed" parameterType="double" value="36"/>
  </ParameterDeclarations>
  <RoadNetwork><LogicFile filepath="../xodr/test.xodr"/></RoadNetwork>
  <Entities>
    <ScenarioObject name="Ego"><CatalogReference catalogName="VehicleCatalog" entryName="car_white"/></ScenarioObject>
    <ScenarioObject name="Truck"><CatalogReference catalogName="VehicleCatalog" entryName="truck_yellow"/></ScenarioObject>
    <ScenarioObject name="Ped">
      <Pedestrian name="p" pedestrianCategory="pedestrian" mass="80">
        <BoundingBox><Center x="0.1" y="0" z="0.9"/><Dimensions width="0.6" length="0.4" height="1.8"/></BoundingBox>
      </Pedestrian>
    </ScenarioObject>
    <ScenarioObject name="Oncoming"><CatalogReference catalogName="VehicleCatalog" entryName="car_red"/></ScenarioObject>
  </Entities>
  <Storyboard><Init><Actions>
    <Private entityRef="Ego">
      <PrivateAction><TeleportAction><Position><LanePosition roadId="1" laneId="-1" offset="0" s="$EgoS"/></Position></TeleportAction></PrivateAction>
      <PrivateAction><LongitudinalAction><SpeedAction>
        <SpeedActionDynamics dynamicsShape="step" dynamicsDimension="time" value="0"/>
        <SpeedActionTarget><AbsoluteTargetSpeed value="\${$Speed / 3.6}"/></SpeedActionTarget>
      </SpeedAction></LongitudinalAction></PrivateAction>
    </Private>
    <Private entityRef="Truck">
      <PrivateAction><TeleportAction><Position><RelativeLanePosition entityRef="Ego" dLane="0" ds="15" offset="0"/></Position></TeleportAction></PrivateAction>
    </Private>
    <Private entityRef="Ped">
      <PrivateAction><TeleportAction><Position>
        <RelativeObjectPosition entityRef="Truck" dx="0" dy="5"><Orientation type="relative" h="1.5"/></RelativeObjectPosition>
      </Position></TeleportAction></PrivateAction>
    </Private>
    <Private entityRef="Oncoming">
      <PrivateAction><TeleportAction><Position><LanePosition roadId="1" laneId="1" offset="0" s="80"/></Position></TeleportAction></PrivateAction>
    </Private>
  </Actions></Init></Storyboard>
</OpenSCENARIO>`

describe('parseOpenScenario', () => {
  const scenario = parseOpenScenario(parseXml(XOSC).doc)
  const network = parseOpenDrive(parseXml(XODR).doc)

  it('读取实体、参数化的初始位置与初始速度', () => {
    expect(scenario.logicFile).toBe('../xodr/test.xodr')
    expect(scenario.entities.map((e) => [e.name, e.kind, e.category])).toEqual([
      ['Ego', 'vehicle', 'car'],
      ['Truck', 'vehicle', 'truck'],
      ['Ped', 'pedestrian', 'pedestrian'],
      ['Oncoming', 'vehicle', 'car'],
    ])
    expect(scenario.entities[2]).toMatchObject({ length: 0.4, width: 0.6, centerX: 0.1 })
    expect(scenario.initPositions.get('Ego')).toMatchObject({ kind: 'lane', s: 20, laneId: -1 })
    expect(scenario.initSpeeds.get('Ego')).toBeCloseTo(10)
  })

  it('按依赖顺序解析相对位置，左侧车道默认反向', () => {
    const poses = resolveInitPoses(scenario, network)
    expect(poses.get('Ego')).toMatchObject({ x: 20, y: -1.75, hdg: 0 })
    expect(poses.get('Truck')).toMatchObject({ x: 35, y: -1.75 })
    expect(poses.get('Ped')?.x).toBeCloseTo(35)
    expect(poses.get('Ped')?.y).toBeCloseTo(3.25)
    expect(poses.get('Ped')?.hdg).toBeCloseTo(1.5)
    expect(poses.get('Oncoming')).toMatchObject({ x: 80, y: 1.75, hdg: Math.PI })
  })

  it('没有路网时只解析世界坐标与相对实体位置', () => {
    expect(resolveInitPoses(scenario, undefined).size).toBe(0)
  })
})
