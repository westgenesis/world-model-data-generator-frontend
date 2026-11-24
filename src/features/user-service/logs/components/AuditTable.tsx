import type { TablePaginationConfig, TableProps } from 'antd'
import { Button, Table } from 'antd'
import type { AuditItem } from '@/api/audits'
import { EnumTag } from '@/components/EnumTag'
import { AuditRiskLevel, AuditStatus } from '@/constants/enums'
import { EMPTY_TEXT, formatDateTime } from '@/lib/format'

interface AuditTableProps {
  data: AuditItem[]
  loading: boolean
  pagination: TablePaginationConfig
  /** 查看审计详情 */
  onDetail: (audit: AuditItem) => void
  /** 处置审计记录 */
  onHandle: (audit: AuditItem) => void
}

/**
 * 安全审计列表表格
 * @param props - 数据、分页与行操作回调
 */
export const AuditTable = ({ data, loading, pagination, onDetail, onHandle }: AuditTableProps) => {
  const columns: TableProps<AuditItem>['columns'] = [
    {
      title: '时间',
      dataIndex: 'ts',
      width: 180,
      render: (value: string) => (
        <span className="text-fg-2 tabular-nums">
          {formatDateTime(value, 'YYYY-MM-DD HH:mm:ss')}
        </span>
      ),
    },
    {
      title: '风险等级',
      dataIndex: 'risk_level',
      width: 110,
      render: (value: AuditItem['risk_level']) => (
        <EnumTag enumDef={AuditRiskLevel} value={value} />
      ),
    },
    {
      title: '事件类型',
      key: 'security',
      width: 200,
      render: (_, audit) => (
        <div className="flex flex-col leading-5">
          <span className="text-fg-2">{audit.security_name || audit.security_type}</span>
          {audit.security_name && (
            <span className="font-mono text-[11px] text-fg-3">{audit.security_type}</span>
          )}
        </div>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      ellipsis: { showTitle: true },
    },
    {
      title: '操作人',
      key: 'operator',
      width: 140,
      render: (_, audit) => {
        const operator = audit.operator
        const name = operator?.full_name || operator?.username
        return name ? (
          <span title={operator?.username}>{name}</span>
        ) : (
          <span className="text-fg-3">{EMPTY_TEXT}</span>
        )
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (value: AuditItem['status']) => <EnumTag enumDef={AuditStatus} value={value} />,
    },
    {
      title: '操作',
      key: 'actions',
      width: 130,
      fixed: 'end',
      render: (_, audit) => (
        <div className="-ms-2 flex items-center">
          <Button type="link" size="small" onClick={() => onDetail(audit)}>
            详情
          </Button>
          <Button type="link" size="small" onClick={() => onHandle(audit)}>
            处置
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-card shadow-card">
      <Table<AuditItem>
        rowKey="audit_id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ ...pagination, className: 'px-4' }}
        scroll={{ x: 1080 }}
      />
    </div>
  )
}
