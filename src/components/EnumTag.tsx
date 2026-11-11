import { Tag } from 'antd'
import { TONE_TAG_COLOR } from '@/constants/tone'
import type { EnumDef } from '@/lib/enum'

interface EnumTagProps<V extends string> {
  /** 枚举定义（来自 src/constants/enums.ts） */
  enumDef: EnumDef<V>
  /** 枚举取值 */
  value: V
}

/**
 * 按统一枚举渲染带色调的状态标签
 * @param props - 枚举定义与取值
 */
export const EnumTag = <V extends string>({ enumDef, value }: EnumTagProps<V>) => (
  <Tag variant="filled" color={TONE_TAG_COLOR[enumDef.getTone(value)]} className="me-0">
    {enumDef.getLabel(value)}
  </Tag>
)
