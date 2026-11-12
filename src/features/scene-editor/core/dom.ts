/**
 * DOM 编辑辅助：克隆文档、按文件原有缩进风格插入 / 删除节点。
 * 编辑函数都先克隆再修改，保证旧文档不变（用于撤销栈）。
 */

/** 元素描述：[标签, 属性, 子元素] */
export type ElSpec = [tag: string, attrs?: Record<string, string | number>, children?: ElSpec[]]

/**
 * 深拷贝 XML 文档
 * @param doc - 原文档
 * @returns 新文档
 */
export const cloneDoc = (doc: XMLDocument): XMLDocument => doc.cloneNode(true) as XMLDocument

/**
 * 数值转属性字符串：去掉浮点噪声，最多保留 6 位小数
 * @param n - 数值
 * @returns 字符串
 */
export const fmt = (n: number): string => {
  if (!Number.isFinite(n)) return '0'
  const s = n.toFixed(6).replace(/\.?0+$/, '')
  return s === '-0' ? '0' : s
}

/**
 * 按描述创建元素树
 * @param doc - 所属文档
 * @param spec - 元素描述
 * @returns 元素
 */
export const build = (doc: XMLDocument, [tag, attrs = {}, kids = []]: ElSpec): Element => {
  const el = doc.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, typeof v === 'number' ? fmt(v) : v)
  for (const k of kids) el.appendChild(build(doc, k))
  return el
}

/**
 * 读取元素所在行的缩进
 * @param el - 元素
 * @returns 缩进字符串；无法判断时返回空串
 */
const indentOf = (el: Element): string => {
  const prev = el.previousSibling
  if (prev?.nodeType !== 3) return ''
  const text = prev.textContent ?? ''
  const nl = text.lastIndexOf('\n')
  return nl >= 0 ? text.slice(nl + 1) : ''
}

/**
 * 推断文档的缩进单位（取根节点第一个子元素的缩进）
 * @param doc - 文档
 * @returns 缩进单位，默认两个空格
 */
const indentUnit = (doc: XMLDocument): string => {
  const first = doc.documentElement.firstElementChild
  const unit = first ? indentOf(first) : ''
  return unit && /^[ \t]+$/.test(unit) ? unit : '  '
}

/**
 * 为新元素子树补上换行与缩进
 * @param el - 元素
 * @param indent - 元素自身的缩进
 * @param unit - 缩进单位
 */
const prettify = (el: Element, indent: string, unit: string) => {
  const kids = Array.from(el.children)
  if (!kids.length) return
  const doc = el.ownerDocument
  for (const k of kids) {
    el.insertBefore(doc.createTextNode(`\n${indent}${unit}`), k)
    prettify(k, indent + unit, unit)
  }
  el.appendChild(doc.createTextNode(`\n${indent}`))
}

/**
 * 计算父元素下子元素应使用的缩进
 * @param parent - 父元素
 * @returns 子元素缩进
 */
const childIndent = (parent: Element): string => {
  const sibling = parent.firstElementChild
  if (sibling) return indentOf(sibling)
  return indentOf(parent) + indentUnit(parent.ownerDocument as XMLDocument)
}

/**
 * 按原文件缩进风格插入子元素
 * @param parent - 父元素
 * @param el - 新元素（可来自 build）
 * @param before - 插在该元素之前；省略时追加到末尾
 * @returns 插入的元素
 */
export const insertPretty = (parent: Element, el: Element, before?: Element | null): Element => {
  const doc = parent.ownerDocument as XMLDocument
  const indent = childIndent(parent)
  prettify(el, indent, indentUnit(doc))
  const hadChildren = !!parent.firstElementChild
  if (before) {
    parent.insertBefore(el, before)
    parent.insertBefore(doc.createTextNode(`\n${indent}`), before)
    return el
  }
  if (!hadChildren) {
    // 空元素：清掉原有空白，写成「换行 + 子元素 + 换行 + 父缩进」
    while (parent.firstChild) parent.removeChild(parent.firstChild)
    parent.appendChild(doc.createTextNode(`\n${indent}`))
    parent.appendChild(el)
    parent.appendChild(doc.createTextNode(`\n${indentOf(parent)}`))
    return el
  }
  const last = parent.lastElementChild as Element
  parent.insertBefore(doc.createTextNode(`\n${indent}`), last.nextSibling)
  parent.insertBefore(el, last.nextSibling?.nextSibling ?? null)
  return el
}

/**
 * 删除元素及其前面的缩进空白
 * @param el - 元素
 */
export const removePretty = (el: Element) => {
  const prev = el.previousSibling
  if (prev?.nodeType === 3 && /^\s*$/.test(prev.textContent ?? '')) prev.remove()
  el.remove()
}

/**
 * 用新元素替换旧元素，保持缩进
 * @param old - 旧元素
 * @param el - 新元素
 * @returns 新元素
 */
export const replacePretty = (old: Element, el: Element): Element => {
  const parent = old.parentElement
  if (!parent) return el
  prettify(el, indentOf(old), indentUnit(parent.ownerDocument as XMLDocument))
  parent.replaceChild(el, old)
  return el
}

/**
 * 获取或按顺序创建直接子元素
 * @param parent - 父元素
 * @param tag - 标签
 * @param before - 不存在时插入到该元素之前
 * @returns 子元素
 */
export const ensureChild = (parent: Element, tag: string, before?: Element | null): Element =>
  Array.from(parent.children).find((c) => c.tagName === tag) ??
  insertPretty(parent, parent.ownerDocument.createElement(tag), before)
