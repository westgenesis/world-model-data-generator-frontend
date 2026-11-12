/**
 * OpenSCENARIO 参数与表达式求值（1.1+）：
 * - `$name` 引用参数
 * - `${ ... }` 表达式，支持 + - * / % 、括号、一元负号与 $参数
 * 不使用 eval，按递归下降解析；不支持的语法返回 undefined。
 */

/** 参数表：名称（不含 $）→ 原始字符串值 */
export type ParamTable = ReadonlyMap<string, string>

/**
 * 解析 ParameterDeclarations 元素
 * @param el - ParameterDeclarations 元素（可为空）
 * @param inherited - 外层参数表
 * @returns 合并后的参数表；参数值本身也可以引用前面声明的参数
 */
export const readParams = (el: Element | undefined, inherited: ParamTable = new Map()) => {
  const table = new Map(inherited)
  for (const decl of Array.from(el?.children ?? [])) {
    if (decl.tagName !== 'ParameterDeclaration') continue
    const name = decl.getAttribute('name')
    const value = decl.getAttribute('value') ?? ''
    if (name) table.set(name, resolveString(value, table) ?? value)
  }
  return table
}

/**
 * 对 `${...}` 内的算术表达式求值
 * @param src - 表达式文本
 * @param params - 参数表
 * @returns 数值；语法不支持时返回 undefined
 */
const evalExpression = (src: string, params: ParamTable): number | undefined => {
  const tokens = src.match(/\$[A-Za-z_]\w*|\d+\.?\d*(?:[eE][-+]?\d+)?|\.\d+|[-+*/%()]/g)
  if (!tokens || tokens.join('') !== src.replace(/\s+/g, '')) return undefined
  let i = 0

  const primary = (): number => {
    const tk = tokens[i++]
    if (tk === '(') {
      const v = sum()
      if (tokens[i++] !== ')') throw new Error('缺少右括号')
      return v
    }
    if (tk === '-') return -primary()
    if (tk === '+') return primary()
    if (tk?.startsWith('$')) {
      const v = Number(params.get(tk.slice(1)))
      if (!Number.isFinite(v)) throw new Error(`参数 ${tk} 不是数值`)
      return v
    }
    const v = Number(tk)
    if (!Number.isFinite(v)) throw new Error(`无法识别 ${tk}`)
    return v
  }
  const product = (): number => {
    let v = primary()
    while (tokens[i] === '*' || tokens[i] === '/' || tokens[i] === '%') {
      const op = tokens[i++]
      const r = primary()
      v = op === '*' ? v * r : op === '/' ? v / r : v % r
    }
    return v
  }
  const sum = (): number => {
    let v = product()
    while (tokens[i] === '+' || tokens[i] === '-') {
      const op = tokens[i++]
      const r = product()
      v = op === '+' ? v + r : v - r
    }
    return v
  }

  try {
    const v = sum()
    return i === tokens.length && Number.isFinite(v) ? v : undefined
  } catch {
    return undefined
  }
}

/**
 * 解析属性原始值：参数引用、表达式或字面量
 * @param raw - 属性原始值
 * @param params - 参数表
 * @returns 解析后的字符串；无法解析时返回 undefined
 */
export const resolveString = (raw: string, params: ParamTable): string | undefined => {
  const value = raw.trim()
  if (value.startsWith('${') && value.endsWith('}')) {
    const v = evalExpression(value.slice(2, -1), params)
    return v === undefined ? undefined : String(v)
  }
  if (value.startsWith('$')) return params.get(value.slice(1))
  return value
}

/**
 * 读取并解析数值属性
 * @param el - 元素
 * @param name - 属性名
 * @param params - 参数表
 * @param fallback - 缺失时的默认值
 * @returns 数值；属性存在但无法解析时返回 NaN
 */
export const paramNum = (
  el: Element | undefined,
  name: string,
  params: ParamTable,
  fallback = 0,
): number => {
  const raw = el?.getAttribute(name)
  if (raw == null) return fallback
  const v = Number(resolveString(raw, params))
  return Number.isFinite(v) ? v : NaN
}

/**
 * 读取并解析字符串属性
 * @param el - 元素
 * @param name - 属性名
 * @param params - 参数表
 * @returns 解析后的字符串，缺失时为空串
 */
export const paramStr = (el: Element | undefined, name: string, params: ParamTable): string => {
  const raw = el?.getAttribute(name)
  return raw == null ? '' : (resolveString(raw, params) ?? raw)
}
