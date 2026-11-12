/**
 * 自车标记与传感器文件引用。
 * - 自车：沿用 CARLA ScenarioRunner 约定，在 Vehicle/Properties 写 <Property name="type" value="ego_vehicle"/>
 * - 传感器配置：自车 Properties 中的 <File filepath="…"/>（XSD 中 Properties 为 Property*、File* 序列）
 */
import { build, cloneDoc, ensureChild, insertPretty, removePretty } from '../dom'
import { childOf, childrenOf, findObject, rootOf } from './edit-base'

/** 自车属性名 / 值（CARLA 约定） */
export const EGO_PROPERTY = { name: 'type', value: 'ego_vehicle' } as const

/**
 * 实体的内联 Vehicle 定义
 * @param so - ScenarioObject 元素
 * @returns Vehicle 元素；目录引用或非车辆时返回 undefined
 */
const vehicleOf = (so: Element | undefined) => {
  const def = so?.firstElementChild ?? undefined
  return def?.tagName === 'Vehicle' ? def : undefined
}

/**
 * 定义中的自车属性元素
 * @param def - 实体定义（Vehicle / Pedestrian / MiscObject）
 * @returns Property 元素；不是自车时返回 undefined
 */
const egoPropertyOf = (def: Element | undefined) =>
  childrenOf(childOf(def, 'Properties'), 'Property').find(
    (p) =>
      p.getAttribute('name') === EGO_PROPERTY.name &&
      p.getAttribute('value') === EGO_PROPERTY.value,
  )

/**
 * 实体定义中的 File 引用
 * @param def - 实体定义
 * @returns File 元素
 */
const fileRefsOf = (def: Element | undefined) => childrenOf(childOf(def, 'Properties'), 'File')

/**
 * 是否为传感器配置文件引用（按扩展名识别，避免误动其他 File）
 * @param file - File 元素
 * @returns 是否为传感器配置
 */
const isSensorRef = (file: Element) => /\.json$/i.test(file.getAttribute('filepath') ?? '')

/** 所有实体定义（不含目录引用） */
const definitions = (doc: XMLDocument) =>
  childrenOf(childOf(rootOf(doc), 'Entities'), 'ScenarioObject').map((so) => ({
    name: so.getAttribute('name') ?? '',
    def: so.firstElementChild ?? undefined,
  }))

/**
 * 标记为自车的实体名（导入的文件可能有多个）
 * @param doc - 文档
 * @returns 实体名列表
 */
export const getEgoNames = (doc: XMLDocument): string[] =>
  definitions(doc)
    .filter(({ def }) => egoPropertyOf(def))
    .map(({ name }) => name)

/**
 * 自车 Properties 中引用的传感器配置路径
 * @param doc - 文档
 * @returns 路径；没有时返回 undefined
 */
export const getSensorFileRef = (doc: XMLDocument): string | undefined => {
  for (const { def } of definitions(doc)) {
    if (!egoPropertyOf(def)) continue
    const ref = fileRefsOf(def).find(isSensorRef)
    if (ref) return ref.getAttribute('filepath') ?? undefined
  }
  return undefined
}

/**
 * 获取（必要时创建）定义的 Properties 元素
 * @param def - Vehicle 元素
 * @returns Properties 元素
 */
const propertiesOf = (def: Element) => ensureChild(def, 'Properties')

/**
 * 指定自车：清除其他实体的自车属性，并把传感器文件引用一起迁移到新自车
 * @param doc - 原文档
 * @param name - 新自车的实体名；传 undefined 表示取消自车
 * @returns 新文档
 * @throws {Error} 实体不存在、不是车辆或为目录引用时抛出
 */
export const setEgo = (doc: XMLDocument, name: string | undefined): XMLDocument => {
  const next = cloneDoc(doc)
  const target = name === undefined ? undefined : vehicleOf(findObject(next, name))
  if (name !== undefined && !target) {
    const def = findObject(next, name)?.firstElementChild
    throw new Error(
      def?.tagName === 'CatalogReference'
        ? `「${name}」是目录引用，请先转为内联定义再设为自车`
        : `「${name}」不是车辆，不能设为自车`,
    )
  }
  const sensorFile = getSensorFileRef(next)
  for (const { def } of definitions(next)) {
    if (def === target) continue
    const prop = egoPropertyOf(def)
    if (prop) removePretty(prop)
    if (prop) fileRefsOf(def).filter(isSensorRef).forEach(removePretty)
  }
  if (target && !egoPropertyOf(target)) {
    const props = propertiesOf(target)
    insertPretty(
      props,
      build(next, ['Property', { ...EGO_PROPERTY }]),
      childOf(props, 'File') ?? null,
    )
  }
  return target && sensorFile ? setSensorFileRef(next, sensorFile, false) : next
}

/**
 * 写入或移除自车的传感器配置文件引用
 * @param doc - 原文档
 * @param path - 文件路径（相对 xosc）；undefined 表示移除
 * @param clone - 是否先克隆文档（内部链式调用时传 false）
 * @returns 新文档；没有自车且需要写入时原样返回
 */
export const setSensorFileRef = (
  doc: XMLDocument,
  path: string | undefined,
  clone = true,
): XMLDocument => {
  const next = clone ? cloneDoc(doc) : doc
  const ego = definitions(next).find(({ def }) => egoPropertyOf(def))?.def
  if (!ego) return path === undefined ? next : doc
  const refs = fileRefsOf(ego).filter(isSensorRef)
  if (path === undefined) {
    refs.forEach(removePretty)
    return next
  }
  if (refs[0]) {
    refs[0].setAttribute('filepath', path)
    refs.slice(1).forEach(removePretty)
  } else {
    insertPretty(propertiesOf(ego), build(next, ['File', { filepath: path }]))
  }
  return next
}
