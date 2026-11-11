/** 枚举项的展示色调，统一映射到 antd Tag 颜色与设计 token */
export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'default'

/** 枚举项定义 */
export interface EnumItem<V extends string = string> {
  /** 与后端约定的取值 */
  value: V
  /** 中文展示文案 */
  label: string
  /** 标签色调，默认 default */
  tone?: Tone
}

/** 由 defineEnum 生成的枚举对象 */
export interface EnumDef<V extends string> {
  /** 原始枚举项（保持定义顺序） */
  items: readonly EnumItem<V>[]
  /** 全部取值，可直接传给 z.enum */
  values: [V, ...V[]]
  /** antd Select / Radio 可用的选项 */
  options: { value: V; label: string }[]
  /**
   * 获取取值对应的文案，未知取值原样返回
   * @param value - 枚举取值
   */
  getLabel: (value: V) => string
  /**
   * 获取取值对应的色调，未知取值返回 default
   * @param value - 枚举取值
   */
  getTone: (value: V) => Tone
}

/** 从枚举对象推导取值联合类型 */
export type EnumValue<E> = E extends EnumDef<infer V> ? V : never

/**
 * 定义一个枚举：集中维护取值、文案与色调，并派生选项、zod 取值等
 * @param items - 枚举项列表（至少一项，使用字面量以保留取值类型）
 * @returns 枚举对象
 * @example
 * const Status = defineEnum([
 *   { value: 'enabled', label: '启用', tone: 'success' },
 *   { value: 'disabled', label: '停用' },
 * ])
 * z.enum(Status.values)
 */
export const defineEnum = <const T extends readonly [EnumItem, ...EnumItem[]]>(
  items: T,
): EnumDef<T[number]['value']> => {
  type V = T[number]['value']
  const map = new Map<string, EnumItem>(items.map((item) => [item.value, item]))
  return {
    items: items as readonly EnumItem<V>[],
    values: items.map((item) => item.value) as [V, ...V[]],
    options: items.map(({ value, label }) => ({ value: value as V, label })),
    getLabel: (value) => map.get(value)?.label ?? value,
    getTone: (value) => map.get(value)?.tone ?? 'default',
  }
}
