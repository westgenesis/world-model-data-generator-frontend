import { Tag } from 'antd'
import type { AuditItem } from '@/api/audits'
import { EnumTag } from '@/components/EnumTag'
import { AuditRiskLevel } from '@/constants/enums'
import { EMPTY_TEXT } from '@/lib/format'

interface RiskLevelTagProps {
  /** 日志记录（列表项或详情均可，均含风险等级字段） */
  audit: AuditItem
}

/**
 * 风险等级标签：有等级 code 时按枚举渲染带色调标签，
 * 仅剩名称时用中性标签兜底，两者皆无则显示占位符
 * @param props - 日志记录
 */
export const RiskLevelTag = ({ audit }: RiskLevelTagProps) => {
  if (audit.risk_level) return <EnumTag enumDef={AuditRiskLevel} value={audit.risk_level} />
  return audit.risk_label ? (
    <Tag variant="filled" color="default" className="me-0">
      {audit.risk_label}
    </Tag>
  ) : (
    EMPTY_TEXT
  )
}
