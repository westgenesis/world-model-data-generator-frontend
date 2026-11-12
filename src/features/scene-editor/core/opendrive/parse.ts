import { child, children, numAttr, strAttr } from '../xml'
import type {
  Geometry,
  Junction,
  Lane,
  LaneSection,
  LinkRef,
  OdrWarning,
  Poly3,
  Road,
  RoadMark,
  RoadNetwork,
} from './types'

/** OpenDRIVE 格式错误（根节点不对等无法继续解析的情况） */
export class OpenDriveError extends Error {
  override name = 'OpenDriveError'
}

/**
 * 读取三次多项式元素
 * @param el - width / border / laneOffset 等元素
 * @param sKey - 起点属性名（laneOffset 为 s，车道宽度为 sOffset）
 * @returns 多项式
 */
const readPoly3 = (el: Element, sKey = 'sOffset'): Poly3 => ({
  sOffset: numAttr(el, sKey),
  a: numAttr(el, 'a'),
  b: numAttr(el, 'b'),
  c: numAttr(el, 'c'),
  d: numAttr(el, 'd'),
})

/**
 * 读取道路级 link（predecessor / successor）
 * @param el - predecessor 或 successor 元素
 * @returns 链接，元素不存在时返回 undefined
 */
const readLink = (el: Element | undefined): LinkRef | undefined => {
  if (!el) return undefined
  const cp = strAttr(el, 'contactPoint')
  return {
    elementType: strAttr(el, 'elementType') === 'junction' ? 'junction' : 'road',
    elementId: strAttr(el, 'elementId'),
    contactPoint: cp === 'start' || cp === 'end' ? cp : undefined,
  }
}

/**
 * 读取平面几何段
 * @param el - geometry 元素
 * @param roadId - 所属道路，用于告警定位
 * @param warnings - 告警收集器
 * @returns 几何段，类型未知时返回 undefined
 */
const readGeometry = (
  el: Element,
  roadId: string,
  warnings: OdrWarning[],
): Geometry | undefined => {
  const base = {
    s: numAttr(el, 's'),
    x: numAttr(el, 'x'),
    y: numAttr(el, 'y'),
    hdg: numAttr(el, 'hdg'),
    length: numAttr(el, 'length'),
  }
  const shape = el.firstElementChild
  switch (shape?.tagName) {
    case 'line':
      return { ...base, kind: 'line' }
    case 'arc':
      return { ...base, kind: 'arc', curvature: numAttr(shape, 'curvature') }
    case 'spiral':
      return {
        ...base,
        kind: 'spiral',
        curvStart: numAttr(shape, 'curvStart'),
        curvEnd: numAttr(shape, 'curvEnd'),
      }
    case 'poly3':
      return {
        ...base,
        kind: 'poly3',
        a: numAttr(shape, 'a'),
        b: numAttr(shape, 'b'),
        c: numAttr(shape, 'c'),
        d: numAttr(shape, 'd'),
      }
    case 'paramPoly3':
      return {
        ...base,
        kind: 'paramPoly3',
        aU: numAttr(shape, 'aU'),
        bU: numAttr(shape, 'bU'),
        cU: numAttr(shape, 'cU'),
        dU: numAttr(shape, 'dU'),
        aV: numAttr(shape, 'aV'),
        bV: numAttr(shape, 'bV'),
        cV: numAttr(shape, 'cV'),
        dV: numAttr(shape, 'dV'),
        pRange: strAttr(shape, 'pRange') === 'normalized' ? 'normalized' : 'arcLength',
      }
    default:
      warnings.push({ roadId, message: `未知几何类型 <${shape?.tagName ?? '空'}>，已跳过` })
      return undefined
  }
}

/**
 * 读取车道
 * @param el - lane 元素
 * @returns 车道
 */
const readLane = (el: Element): Lane => {
  const link = child(el, 'link')
  const pred = child(link, 'predecessor')
  const succ = child(link, 'successor')
  const bySOffset = (a: { sOffset: number }, b: { sOffset: number }) => a.sOffset - b.sOffset
  return {
    id: numAttr(el, 'id'),
    type: strAttr(el, 'type', 'none'),
    widths: children(el, 'width')
      .map((w) => readPoly3(w))
      .sort(bySOffset),
    borders: children(el, 'border')
      .map((b) => readPoly3(b))
      .sort(bySOffset),
    roadMarks: children(el, 'roadMark')
      .map((m): RoadMark => ({
        sOffset: numAttr(m, 'sOffset'),
        type: strAttr(m, 'type', 'none'),
        color: strAttr(m, 'color', 'standard'),
        width: numAttr(m, 'width', 0.12),
      }))
      .sort(bySOffset),
    predecessor: pred ? numAttr(pred, 'id') : undefined,
    successor: succ ? numAttr(succ, 'id') : undefined,
  }
}

/**
 * 读取道路
 * @param el - road 元素
 * @param warnings - 告警收集器
 * @returns 道路
 */
const readRoad = (el: Element, warnings: OdrWarning[]): Road => {
  const id = strAttr(el, 'id')
  const length = numAttr(el, 'length')
  const link = child(el, 'link')
  const lanesEl = child(el, 'lanes')

  const geometries = children(child(el, 'planView'), 'geometry')
    .map((g) => readGeometry(g, id, warnings))
    .filter((g): g is Geometry => !!g)
    .sort((a, b) => a.s - b.s)

  const sectionEls = children(lanesEl, 'laneSection')
    .map((ls) => ({ el: ls, s: numAttr(ls, 's') }))
    .sort((a, b) => a.s - b.s)

  const laneSections = sectionEls.map(({ el: ls, s }, i): LaneSection => {
    if (ls.getAttribute('singleSide') === 'true') {
      warnings.push({ roadId: id, message: 'laneSection singleSide 未支持，按双侧处理' })
    }
    const side = (tag: string) => children(child(ls, tag), 'lane').map(readLane)
    const center = side('center')[0] ?? {
      id: 0,
      type: 'none',
      widths: [],
      borders: [],
      roadMarks: [],
    }
    return {
      s,
      sEnd: sectionEls[i + 1]?.s ?? length,
      left: side('left').sort((a, b) => a.id - b.id),
      center,
      right: side('right').sort((a, b) => b.id - a.id),
    }
  })

  if (children(child(el, 'lateralProfile'), 'shape').length > 0) {
    warnings.push({ roadId: id, message: 'lateralProfile/shape 未支持，已忽略' })
  }

  return {
    id,
    name: strAttr(el, 'name'),
    length,
    junction: strAttr(el, 'junction', '-1'),
    rule: strAttr(el, 'rule') === 'LHT' ? 'LHT' : 'RHT',
    predecessor: readLink(child(link, 'predecessor')),
    successor: readLink(child(link, 'successor')),
    geometries,
    laneOffsets: children(lanesEl, 'laneOffset')
      .map((o) => readPoly3(o, 's'))
      .sort((a, b) => a.sOffset - b.sOffset),
    laneSections,
  }
}

/**
 * 读取路口
 * @param el - junction 元素
 * @returns 路口
 */
const readJunction = (el: Element): Junction => ({
  id: strAttr(el, 'id'),
  name: strAttr(el, 'name'),
  connections: children(el, 'connection').map((c) => ({
    id: strAttr(c, 'id'),
    incomingRoad: strAttr(c, 'incomingRoad'),
    connectingRoad: strAttr(c, 'connectingRoad'),
    contactPoint: strAttr(c, 'contactPoint') === 'end' ? 'end' : 'start',
    laneLinks: children(c, 'laneLink').map((l) => ({
      from: numAttr(l, 'from'),
      to: numAttr(l, 'to'),
    })),
  })),
})

/**
 * 将 OpenDRIVE DOM 解析为只读路网模型
 * @param doc - XML 文档
 * @returns 路网
 * @throws {OpenDriveError} 根节点不是 OpenDRIVE 时抛出
 */
export const parseOpenDrive = (doc: XMLDocument): RoadNetwork => {
  const root = doc.documentElement
  if (root.tagName !== 'OpenDRIVE') {
    throw new OpenDriveError(`根节点应为 <OpenDRIVE>，实际为 <${root.tagName}>`)
  }
  const warnings: OdrWarning[] = []
  const header = child(root, 'header')
  return {
    version: `${strAttr(header, 'revMajor', '1')}.${strAttr(header, 'revMinor', '?')}`,
    geoReference: child(header, 'geoReference')?.textContent?.trim() || undefined,
    roads: children(root, 'road').map((r) => readRoad(r, warnings)),
    junctions: children(root, 'junction').map(readJunction),
    warnings,
  }
}
