import { beforeEach, describe, expect, it } from 'vitest'
import { addEntity, createEmptyScenario } from '../core/openscenario/edit'
import { parseOpenScenario } from '../core/openscenario/parse'
import { serializeXml } from '../core/xml'
import { useSceneEditorStore } from './scene-editor-store'

const store = () => useSceneEditorStore.getState()
const names = () => parseOpenScenario(store().xosc?.doc as XMLDocument).entities.map((e) => e.name)

describe('scene-editor-store', () => {
  beforeEach(() => store().reset())

  it('提交、撤销、重做', () => {
    store().load('xosc', createEmptyScenario({ logicFile: 'r.xodr' }), 'a.xosc')
    const doc = addEntity(
      store().xosc?.doc as XMLDocument,
      {
        name: 'Car1',
        kind: 'vehicle',
        category: 'car',
        length: 4,
        width: 2,
        height: 1.5,
      },
      { kind: 'world', x: 0, y: 0, h: 0 },
    )
    store().commit('xosc', doc, '添加 Car1')
    store().select('Car1')
    expect(names()).toEqual(['Car1'])
    expect(store().dirty).toBe(true)

    store().undo()
    expect(names()).toEqual([])
    // 撤销后选中的实体不存在，自动取消选中
    expect(store().selected).toBeUndefined()
    store().redo()
    expect(names()).toEqual(['Car1'])
    // 导入本身也可撤销
    store().undo()
    store().undo()
    expect(store().xosc).toBeUndefined()
  })

  it('修改 XML 文本：合法时替换并保留声明，非法时抛错且不改变文档', () => {
    store().load('xosc', createEmptyScenario({ logicFile: 'r.xodr' }), 'a.xosc')
    const before = store().xosc
    const text = serializeXml(before!).replace('r.xodr', 'other.xodr')
    store().replaceText('xosc', text)
    expect(parseOpenScenario(store().xosc!.doc).logicFile).toBe('other.xodr')
    expect(serializeXml(store().xosc!).startsWith('<?xml')).toBe(true)

    const after = store().xosc
    expect(() => store().replaceText('xosc', '<OpenSCENARIO><Entities></OpenSCENARIO>')).toThrow()
    expect(() => store().replaceText('xosc', '<OpenDRIVE/>')).toThrow('OpenSCENARIO')
    expect(store().xosc).toBe(after)
  })

  it('保存后清除未保存标记', () => {
    store().load('xosc', createEmptyScenario({ logicFile: 'r.xodr' }), 'a.xosc')
    store().markSaved()
    expect(store().dirty).toBe(false)
  })
})
