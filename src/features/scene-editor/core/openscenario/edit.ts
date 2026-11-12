/**
 * OpenSCENARIO 编辑函数：输入旧文档，返回修改后的新文档（旧文档不变）。
 * 只改动与操作相关的节点，其余内容（包括未识别的元素与注释）原样保留。
 * 关键帧相关函数位于 edit-trajectory.ts，这里一并导出，调用方只需从本文件引入。
 */
import type { ElSpec } from '../dom'
import {
  build,
  cloneDoc,
  ensureChild,
  fmt,
  insertPretty,
  removePretty,
  replacePretty,
} from '../dom'
import type { XmlSource } from '../xml'
import { parseXml } from '../xml'
import type { EntityDraft, InitPose } from './edit-base'
import {
  childOf,
  cleanupEditorStory,
  ensureRevMinor,
  findObject,
  initPrivate,
  managedGroup,
  PREFIX,
  ROLE_REV_MINOR,
  rootOf,
  setInitPose,
} from './edit-base'

export type { EntityDraft, InitPose, Keyframe } from './edit-base'
export { ensureRevMinor, revMinor, ROLE_REV_MINOR, setInitPose } from './edit-base'
export { getStopTime, setKeyframes, setStopTime, withHeadings } from './edit-trajectory'

/**
 * 实体定义的元素描述（OpenSCENARIO 1.x 内联定义）
 * @param d - 实体定义
 * @returns 元素描述
 */
const definitionSpec = (d: EntityDraft): ElSpec => {
  const centerX = d.kind === 'vehicle' ? d.length * 0.3 : 0
  const bbox: ElSpec = [
    'BoundingBox',
    {},
    [
      ['Center', { x: centerX, y: 0, z: d.height / 2 }],
      ['Dimensions', { width: d.width, length: d.length, height: d.height }],
    ],
  ]
  if (d.kind === 'pedestrian') {
    return [
      'Pedestrian',
      {
        name: d.category,
        mass: 80,
        model: d.category,
        pedestrianCategory: d.category,
        ...(d.role ? { role: d.role } : {}),
      },
      [['ParameterDeclarations'], bbox, ['Properties']],
    ]
  }
  if (d.kind === 'misc') {
    return [
      'MiscObject',
      { name: d.category, mass: 50, miscObjectCategory: d.category },
      [['ParameterDeclarations'], bbox, ['Properties']],
    ]
  }
  const wheelbase = d.length * 0.6
  const track = Math.max(d.width - 0.2, 0.3)
  return [
    'Vehicle',
    { name: d.category, vehicleCategory: d.category, ...(d.role ? { role: d.role } : {}) },
    [
      ['ParameterDeclarations'],
      bbox,
      ['Performance', { maxSpeed: d.maxSpeed ?? 69.444, maxAcceleration: 10, maxDeceleration: 10 }],
      [
        'Axles',
        {},
        [
          [
            'FrontAxle',
            {
              maxSteering: 0.5236,
              wheelDiameter: 0.7,
              trackWidth: track,
              positionX: wheelbase,
              positionZ: 0.35,
            },
          ],
          [
            'RearAxle',
            {
              maxSteering: 0,
              wheelDiameter: 0.7,
              trackWidth: track,
              positionX: 0,
              positionZ: 0.35,
            },
          ],
        ],
      ],
      ['Properties'],
    ],
  ]
}

/**
 * 新建空场景
 * @param options.logicFile - 引用的 xodr 路径（相对 xosc）
 * @param options.description - 场景描述
 * @param options.stopTime - 仿真时长（秒）
 * @returns XML 源
 */
export const createEmptyScenario = ({
  logicFile,
  description = '场景编辑器新建场景',
  stopTime = 20,
}: {
  logicFile: string
  description?: string
  stopTime?: number
}): XmlSource => {
  const date = new Date().toISOString().slice(0, 19)
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return parseXml(`<?xml version="1.0" encoding="UTF-8"?>
<OpenSCENARIO>
  <FileHeader revMajor="1" revMinor="2" date="${date}" description="${esc(description)}" author="WMDG Scene Editor"/>
  <ParameterDeclarations/>
  <CatalogLocations/>
  <RoadNetwork>
    <LogicFile filepath="${esc(logicFile)}"/>
  </RoadNetwork>
  <Entities/>
  <Storyboard>
    <Init>
      <Actions/>
    </Init>
    <StopTrigger>
      <ConditionGroup>
        <Condition name="${PREFIX}StopTime" delay="0" conditionEdge="rising">
          <ByValueCondition>
            <SimulationTimeCondition value="${fmt(stopTime)}" rule="greaterThan"/>
          </ByValueCondition>
        </Condition>
      </ConditionGroup>
    </StopTrigger>
  </Storyboard>
</OpenSCENARIO>`)
}

/**
 * 新增实体：内联定义 + 初始位置 + 可选初始速度
 * @param doc - 原文档
 * @param draft - 实体定义
 * @param pose - 初始位置
 * @param speed - 初始速度（m/s），省略则不写
 * @returns 新文档
 * @throws {Error} 实体名已存在时抛出
 */
export const addEntity = (
  doc: XMLDocument,
  draft: EntityDraft,
  pose: InitPose,
  speed?: number,
): XMLDocument => {
  if (findObject(doc, draft.name)) throw new Error(`实体名「${draft.name}」已存在`)
  const next = cloneDoc(doc)
  const root = rootOf(next)
  const entities = ensureChild(root, 'Entities', childOf(root, 'Storyboard') ?? null)
  insertPretty(
    entities,
    build(next, ['ScenarioObject', { name: draft.name }, [definitionSpec(draft)]]),
  )
  if (draft.role && draft.kind !== 'misc') ensureRevMinor(next, ROLE_REV_MINOR)
  const result = setInitPose(next, draft.name, pose, false)
  return speed === undefined ? result : setInitSpeed(result, draft.name, speed, false)
}

/**
 * 查找引用了某实体的元素（entityRef 类属性），不含实体定义本身
 * @param doc - 文档
 * @param name - 实体名
 * @returns 元素列表
 */
export const findEntityReferences = (doc: XMLDocument, name: string): Element[] =>
  Array.from(doc.getElementsByTagName('*')).filter((el) =>
    Array.from(el.attributes).some((a) => /entityref$/i.test(a.name) && a.value === name),
  )

/**
 * 删除实体及其初始化动作和编辑器生成的轨迹
 * @param doc - 原文档
 * @param name - 实体名
 * @returns 新文档，以及仍然引用该实体的元素数量（需要用户处理）
 */
export const removeEntity = (doc: XMLDocument, name: string) => {
  const next = cloneDoc(doc)
  const so = findObject(next, name)
  if (so) removePretty(so)
  const priv = initPrivate(next, name, false)
  if (priv) removePretty(priv)
  const group = managedGroup(next, name)
  if (group) removePretty(group)
  cleanupEditorStory(next)
  return { doc: next, danglingRefs: findEntityReferences(next, name).length }
}

/**
 * 重命名实体，同步所有 entityRef 类引用（含通过参数间接引用）与编辑器生成的元素名
 * @param doc - 原文档
 * @param from - 原名
 * @param to - 新名
 * @returns 新文档
 * @throws {Error} 新名称为空或已存在时抛出
 */
export const renameEntity = (doc: XMLDocument, from: string, to: string): XMLDocument => {
  const name = to.trim()
  if (!name) throw new Error('名称不能为空')
  if (name === from) return doc
  if (findObject(doc, name)) throw new Error(`实体名「${name}」已存在`)
  const next = cloneDoc(doc)
  findObject(next, from)?.setAttribute('name', name)
  for (const el of findEntityReferences(next, from)) {
    for (const a of Array.from(el.attributes)) {
      if (/entityref$/i.test(a.name) && a.value === from) el.setAttribute(a.name, name)
    }
  }
  // 通过参数间接引用实体（entityRef="$owner"，owner 的值为实体名）时，同步参数值
  const refParams = new Set<string>()
  for (const el of Array.from(next.getElementsByTagName('*'))) {
    for (const a of Array.from(el.attributes)) {
      if (/entityref$/i.test(a.name) && a.value.startsWith('$')) refParams.add(a.value.slice(1))
    }
  }
  for (const decl of Array.from(next.getElementsByTagName('ParameterDeclaration'))) {
    if (refParams.has(decl.getAttribute('name') ?? '') && decl.getAttribute('value') === from) {
      decl.setAttribute('value', name)
    }
  }
  const group = managedGroup(next, from)
  if (group) {
    for (const el of [group, ...Array.from(group.getElementsByTagName('*'))]) {
      const n = el.getAttribute('name')
      if (n?.startsWith(`${PREFIX}${from}`)) {
        el.setAttribute('name', `${PREFIX}${name}${n.slice(PREFIX.length + from.length)}`)
      }
    }
  }
  return next
}

/**
 * 修改内联实体的类别与尺寸（目录引用实体不处理）
 * @param doc - 原文档
 * @param name - 实体名
 * @param props - 要修改的字段
 * @returns 新文档
 */
export const setEntityProps = (
  doc: XMLDocument,
  name: string,
  props: Partial<Pick<EntityDraft, 'category' | 'length' | 'width' | 'height' | 'role'>>,
): XMLDocument => {
  const next = cloneDoc(doc)
  const def = findObject(next, name)?.firstElementChild
  if (!def || def.tagName === 'CatalogReference') return doc
  // role 为空串表示清除
  if (props.role !== undefined && def.tagName !== 'MiscObject') {
    if (props.role) {
      def.setAttribute('role', props.role)
      ensureRevMinor(next, ROLE_REV_MINOR)
    } else {
      def.removeAttribute('role')
    }
  }
  if (props.category) {
    const attr =
      def.tagName === 'Pedestrian'
        ? 'pedestrianCategory'
        : def.tagName === 'MiscObject'
          ? 'miscObjectCategory'
          : 'vehicleCategory'
    def.setAttribute(attr, props.category)
  }
  const bbox = childOf(def, 'BoundingBox')
  const dim = childOf(bbox, 'Dimensions')
  const center = childOf(bbox, 'Center')
  if (dim) {
    if (props.length !== undefined) dim.setAttribute('length', fmt(props.length))
    if (props.width !== undefined) dim.setAttribute('width', fmt(props.width))
    if (props.height !== undefined) dim.setAttribute('height', fmt(props.height))
  }
  if (center) {
    if (props.length !== undefined && def.tagName === 'Vehicle') {
      center.setAttribute('x', fmt(props.length * 0.3))
    }
    if (props.height !== undefined) center.setAttribute('z', fmt(props.height / 2))
  }
  return next
}

/**
 * 把目录引用实体转为内联定义（使用当前显示的尺寸）
 * @param doc - 原文档
 * @param draft - 内联定义
 * @returns 新文档
 */
export const catalogToInline = (doc: XMLDocument, draft: EntityDraft): XMLDocument => {
  const next = cloneDoc(doc)
  const ref = findObject(next, draft.name)?.firstElementChild
  if (ref?.tagName !== 'CatalogReference') return doc
  replacePretty(ref, build(next, definitionSpec(draft)))
  if (draft.role && draft.kind !== 'misc') ensureRevMinor(next, ROLE_REV_MINOR)
  return next
}

/**
 * 设置初始速度（Init 中的 AbsoluteTargetSpeed）
 * @param doc - 原文档
 * @param name - 实体名
 * @param speed - 速度（m/s）
 * @param clone - 是否先克隆
 * @returns 新文档
 */
export const setInitSpeed = (
  doc: XMLDocument,
  name: string,
  speed: number,
  clone = true,
): XMLDocument => {
  const next = clone ? cloneDoc(doc) : doc
  const priv = initPrivate(next, name, true) as Element
  const target = Array.from(priv.getElementsByTagName('AbsoluteTargetSpeed'))[0]
  if (target) {
    target.setAttribute('value', fmt(speed))
    return next
  }
  insertPretty(
    priv,
    build(next, [
      'PrivateAction',
      {},
      [
        [
          'LongitudinalAction',
          {},
          [
            [
              'SpeedAction',
              {},
              [
                [
                  'SpeedActionDynamics',
                  { dynamicsShape: 'step', value: 0, dynamicsDimension: 'time' },
                ],
                ['SpeedActionTarget', {}, [['AbsoluteTargetSpeed', { value: speed }]]],
              ],
            ],
          ],
        ],
      ],
    ]),
  )
  return next
}

/**
 * 设置 RoadNetwork/LogicFile 路径
 * @param doc - 原文档
 * @param filepath - xodr 路径
 * @returns 新文档
 */
export const setLogicFile = (doc: XMLDocument, filepath: string): XMLDocument => {
  const next = cloneDoc(doc)
  const root = rootOf(next)
  const network = ensureChild(root, 'RoadNetwork', childOf(root, 'Entities') ?? null)
  const logic = ensureChild(network, 'LogicFile', network.firstElementChild)
  logic.setAttribute('filepath', filepath)
  return next
}

/**
 * 生成不重复的实体名
 * @param existing - 已有名称
 * @param prefix - 前缀
 * @returns 新名称，如 Car3
 */
export const uniqueName = (existing: Iterable<string>, prefix: string): string => {
  const set = new Set(existing)
  for (let i = 1; ; i++) if (!set.has(`${prefix}${i}`)) return `${prefix}${i}`
}
