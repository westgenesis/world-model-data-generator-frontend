import { describe, expect, it, vi } from 'vitest'
import { parseXml, serializeXml } from '../xml'
import { buildNetworkMesh, laneToWorld } from './lanes'
import { OpenDriveError, parseOpenDrive } from './parse'

/** 一条 100 m 直路：左 1 右 2 车道，带 laneOffset、未知扩展节点与注释 */
const XODR = `<?xml version="1.0" encoding="UTF-8"?>
<OpenDRIVE>
  <!-- 注释需要保留 -->
  <header revMajor="1" revMinor="6" name="test"/>
  <road id="7" length="100" junction="-1" rule="RHT">
    <link><successor elementType="junction" elementId="3"/></link>
    <planView>
      <geometry s="0" x="0" y="0" hdg="0" length="100"><line/></geometry>
    </planView>
    <lanes>
      <laneOffset s="0" a="0.5" b="0" c="0" d="0"/>
      <laneSection s="0">
        <left><lane id="1" type="sidewalk"><width sOffset="0" a="2" b="0" c="0" d="0"/></lane></left>
        <center><lane id="0" type="none"><roadMark sOffset="0" type="solid" color="yellow" width="0.15"/></lane></center>
        <right>
          <lane id="-2" type="shoulder"><width sOffset="0" a="1" b="0" c="0" d="0"/></lane>
          <lane id="-1" type="driving">
            <link><successor id="-1"/></link>
            <width sOffset="0" a="3.5" b="0" c="0" d="0"/>
            <roadMark sOffset="0" type="broken" color="standard" width="0.12"/>
          </lane>
        </right>
      </laneSection>
    </lanes>
    <userData code="vendor" value="keep-me"/>
  </road>
</OpenDRIVE>`

describe('parseOpenDrive', () => {
  const network = parseOpenDrive(parseXml(XODR).doc)
  const road = network.roads[0]

  it('读取头信息、道路、链接与车道（右侧车道按 id 降序）', () => {
    expect(network.version).toBe('1.6')
    expect(road).toMatchObject({ id: '7', length: 100, rule: 'RHT' })
    expect(road.successor).toEqual({
      elementType: 'junction',
      elementId: '3',
      contactPoint: undefined,
    })
    const section = road.laneSections[0]
    expect(section.sEnd).toBe(100)
    expect(section.right.map((l) => l.id)).toEqual([-1, -2])
    expect(section.right[0].successor).toBe(-1)
    expect(section.center.roadMarks[0]).toMatchObject({ type: 'solid', color: 'yellow' })
  })

  it('车道坐标叠加 laneOffset 与宽度', () => {
    // 右 1 车道中心：0.5 - 3.5 / 2 = -1.25
    expect(laneToWorld(road, -1, 40)).toMatchObject({ x: 40, y: -1.25 })
    // 右 2 车道中心：0.5 - 3.5 - 0.5 = -3.5
    expect(laneToWorld(road, -2, 40)?.y).toBeCloseTo(-3.5)
    expect(laneToWorld(road, -9, 40)).toBeUndefined()
  })

  it('采样生成车道多边形与标线', () => {
    const mesh = buildNetworkMesh(network, 10)
    expect(mesh.lanes).toHaveLength(3)
    expect(mesh.marks.map((m) => m.type).sort()).toEqual(['broken', 'solid'])
    expect(mesh.bounds?.[0]).toBeCloseTo(0)
    expect(mesh.bounds?.[2]).toBeCloseTo(100)
  })

  it('原样导出：声明、注释与未识别节点都保留', () => {
    const out = serializeXml(parseXml(XODR))
    expect(out.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(out).toContain('<!-- 注释需要保留 -->')
    expect(out).toContain('<userData code="vendor" value="keep-me"/>')
    // 再解析一次结果不变
    expect(parseOpenDrive(parseXml(out).doc)).toEqual(network)
  })

  it('序列化器自带声明时不重复输出（Chrome 行为）', () => {
    const source = parseXml(XODR)
    const original = XMLSerializer.prototype.serializeToString
    const spy = vi.spyOn(XMLSerializer.prototype, 'serializeToString').mockImplementation(function (
      this: XMLSerializer,
      node: Node,
    ) {
      // Chrome 只在序列化整个文档时输出声明
      const body = original.call(this, node)
      return node.nodeType === Node.DOCUMENT_NODE
        ? `<?xml version="1.0" standalone="yes"?>${body}`
        : body
    })
    const out = serializeXml(source)
    spy.mockRestore()
    expect(out.match(/<\?xml/g)).toHaveLength(1)
    expect(out.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<OpenDRIVE>')).toBe(true)
  })

  it('根元素前的多行注释各占一行', () => {
    const out = serializeXml(
      parseXml('<?xml version="1.0"?>\n<!-- a -->\n<!-- b -->\n<OpenDRIVE/>'),
    )
    expect(out).toBe('<?xml version="1.0"?>\n<!-- a -->\n<!-- b -->\n<OpenDRIVE/>')
  })

  it('根节点不对或 XML 不合法时报错', () => {
    expect(() => parseOpenDrive(parseXml('<OpenSCENARIO/>').doc)).toThrow(OpenDriveError)
    expect(() => parseXml('<OpenDRIVE><road></OpenDRIVE>')).toThrow()
  })
})
