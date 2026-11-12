import { describe, expect, it } from 'vitest'
import { buildNetworkMesh } from './opendrive/lanes'
import { parseOpenDrive } from './opendrive/parse'
import { addEntity, createEmptyScenario, setKeyframes } from './openscenario/edit'
import { buildMotions } from './openscenario/motion'
import { parseOpenScenario } from './openscenario/parse'
import { resolveInitPoses } from './openscenario/resolve'
import { validateScene } from './validate'
import { parseXml } from './xml'

const network = parseOpenDrive(
  parseXml(`<OpenDRIVE><header revMajor="1" revMinor="6"/>
  <road id="1" length="100" junction="-1">
    <planView><geometry s="0" x="0" y="0" hdg="0" length="100"><line/></geometry></planView>
    <lanes><laneSection s="0"><center><lane id="0" type="none"/></center>
      <right><lane id="-1" type="driving"><width sOffset="0" a="3.5" b="0" c="0" d="0"/></lane></right>
    </laneSection></lanes>
  </road></OpenDRIVE>`).doc,
)
const mesh = buildNetworkMesh(network, 1)

/** 对文档运行校验 */
const check = (doc: XMLDocument) => {
  const scenario = parseOpenScenario(doc)
  const poses = resolveInitPoses(scenario, network)
  return validateScene({
    scenario,
    doc,
    mesh,
    poses,
    motions: buildMotions(scenario, network, poses),
  })
}

const car = {
  name: 'Car1',
  kind: 'vehicle' as const,
  category: 'car',
  length: 4.6,
  width: 1.8,
  height: 1.5,
}

describe('validateScene', () => {
  it('正常场景没有错误和警告', () => {
    const doc = addEntity(createEmptyScenario({ logicFile: 'r.xodr' }).doc, car, {
      kind: 'world',
      x: 10,
      y: -1.75,
      h: 0,
    })
    expect(check(doc).filter((i) => i.level !== 'info')).toEqual([])
  })

  it('发现离开路面、速度过快与悬空引用', () => {
    let doc = addEntity(createEmptyScenario({ logicFile: 'r.xodr' }).doc, car, {
      kind: 'world',
      x: 10,
      y: -1.75,
      h: 0,
    })
    doc = setKeyframes(doc, 'Car1', [
      { t: 0, x: 10, y: -1.75 },
      { t: 1, x: 90, y: -1.75 },
      { t: 2, x: 95, y: 20 },
    ])
    const messages = check(doc).map((i) => i.message)
    expect(messages).toContain('Car1 第 1→2 段速度 80.0 m/s 过快')
    expect(messages).toContain('Car1 第 3 帧不在路面上')

    doc.getElementsByTagName('EntityRef')[0].setAttribute('entityRef', 'Ghost')
    expect(check(doc).map((i) => i.message)).toContain('引用了不存在的实体「Ghost」（1 处）')
  })

  it('缺少路网与场景时给出提示', () => {
    expect(validateScene({}).map((i) => i.level)).toEqual(['warning', 'info'])
  })
})
