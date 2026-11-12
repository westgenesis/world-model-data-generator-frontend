/**
 * XML 基础工具：基于浏览器 DOMParser / XMLSerializer。
 * 解析后保留完整 DOM，导出时直接序列化，未识别的节点、属性与注释不会丢失。
 */

/** XML 解析结果：DOM 文档 + 原始声明（XMLSerializer 不输出 `<?xml ...?>`，需自行补回） */
export interface XmlSource {
  doc: XMLDocument
  /** 原文件开头的 XML 声明，没有则为空串 */
  declaration: string
}

/** XML 解析失败 */
export class XmlParseError extends Error {
  override name = 'XmlParseError'
}

/**
 * 去掉浏览器解析错误信息中的固定说明文字（Chrome 会附带「This page contains…」「Below is a rendering…」）
 * @param raw - parsererror 文本
 * @returns 精简后的错误信息
 */
const cleanParserError = (raw: string): string => {
  const text = raw
    .replace(/This page contains the following errors:/i, '')
    .replace(/Below is a rendering of the page up to the first error\.?/i, '')
    .trim()
  return text || 'XML 格式错误'
}

/**
 * 解析 XML 文本
 * @param text - XML 文本
 * @returns DOM 文档与 XML 声明
 * @throws {XmlParseError} 文本不是格式良好的 XML 时抛出
 */
export const parseXml = (text: string): XmlSource => {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  const error = doc.getElementsByTagName('parsererror')[0]
  if (error) throw new XmlParseError(cleanParserError(error.textContent ?? ''))
  const declaration = /^\uFEFF?\s*(<\?xml[^?]*\?>)/.exec(text)?.[1] ?? ''
  return { doc, declaration }
}

/**
 * 序列化 XML 文档，补回原始声明。
 * - 逐个序列化顶层节点（根元素前后的注释等）并换行连接：DOM 不保存根元素之外的空白，
 *   直接序列化整个文档会把多行注释挤到一行
 * - 各实现对声明的处理不一致（Chrome 序列化整个文档时会自行输出 `<?xml … standalone?>`，jsdom 不输出），
 *   逐节点序列化不会带声明，再统一写回原文声明，避免重复
 * @param source - 解析结果
 * @returns XML 文本
 */
export const serializeXml = ({ doc, declaration }: XmlSource): string => {
  const serializer = new XMLSerializer()
  const body = Array.from(doc.childNodes)
    .map((node) => serializer.serializeToString(node))
    .join('\n')
  return declaration ? `${declaration}\n${body}` : body
}

/**
 * 获取直接子元素（按标签名过滤）
 * @param el - 父元素
 * @param tag - 标签名，省略时返回全部子元素
 * @returns 子元素列表
 */
export const children = (el: Element | null | undefined, tag?: string): Element[] => {
  if (!el) return []
  const list = Array.from(el.children)
  return tag ? list.filter((c) => c.tagName === tag) : list
}

/**
 * 获取第一个匹配的直接子元素
 * @param el - 父元素
 * @param tag - 标签名
 * @returns 子元素，不存在时返回 undefined
 */
export const child = (el: Element | null | undefined, tag: string): Element | undefined =>
  children(el, tag)[0]

/**
 * 读取数值属性
 * @param el - 元素
 * @param name - 属性名
 * @param fallback - 缺失或无法解析时的默认值
 * @returns 数值
 */
export const numAttr = (el: Element | null | undefined, name: string, fallback = 0): number => {
  const raw = el?.getAttribute(name)
  if (raw == null || raw.trim() === '') return fallback
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

/**
 * 读取字符串属性
 * @param el - 元素
 * @param name - 属性名
 * @param fallback - 缺失时的默认值
 * @returns 属性值
 */
export const strAttr = (el: Element | null | undefined, name: string, fallback = ''): string =>
  el?.getAttribute(name) ?? fallback
