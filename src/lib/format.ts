import dayjs from 'dayjs'

/** 空值占位符 */
export const EMPTY_TEXT = '—'

/**
 * 格式化时间
 * @param value - ISO 时间字符串
 * @param pattern - dayjs 格式，默认 `YYYY-MM-DD HH:mm`
 * @returns 格式化后的时间；空值返回占位符
 */
export const formatDateTime = (
  value: string | null | undefined,
  pattern = 'YYYY-MM-DD HH:mm',
): string => (value ? dayjs(value).format(pattern) : EMPTY_TEXT)

/**
 * 格式化日期（YYYY-MM-DD）
 * @param value - ISO 时间字符串
 * @returns 格式化后的日期；空值返回占位符
 */
export const formatDate = (value: string | null | undefined): string =>
  formatDateTime(value, 'YYYY-MM-DD')

/**
 * 格式化数字（千分位）
 * @param value - 数值
 * @param fractionDigits - 最多保留的小数位数，默认 0
 * @returns 格式化后的数字；空值返回占位符
 */
export const formatNumber = (value: number | null | undefined, fractionDigits = 0): string =>
  value === null || value === undefined
    ? EMPTY_TEXT
    : value.toLocaleString('zh-CN', { maximumFractionDigits: fractionDigits })

/**
 * 格式化带符号的百分比
 * @param ratio - 小数比例，如 0.18
 * @returns 如 `+18%`、`-4%`；空值返回占位符
 */
export const formatSignedPercent = (ratio: number | null | undefined): string => {
  if (ratio === null || ratio === undefined) return EMPTY_TEXT
  const percent = Math.round(ratio * 100)
  return `${percent > 0 ? '+' : ''}${percent}%`
}

/**
 * 计算占比百分比（0–100，向下取整，超出参考值时封顶 100）
 * @param used - 已用量
 * @param total - 参考值
 * @returns 百分比
 */
export const toPercent = (used: number, total: number): number =>
  total > 0 ? Math.min(100, Math.floor((used / total) * 100)) : 0
