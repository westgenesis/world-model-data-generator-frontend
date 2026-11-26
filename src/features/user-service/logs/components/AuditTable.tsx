import type { TablePaginationConfig, TableProps } from 'antd'
import { Button, Table } from 'antd'
import type { AuditItem } from '@/api/audits'
import { EMPTY_TEXT, formatDateTime } from '@/lib/format'
import { RiskLevelTag } from './RiskLevelTag'

interface AuditTableProps {
  data: AuditItem[]
  loading: boolean
  pagination: TablePaginationConfig
  /** 查看日志详情 */
  onDetail: (audit: AuditItem) => void
}

/**
 * 日志列表表格：仅展示重要字段，完整字段在详情弹窗中查看
 * @param props - 数据、分页与详情回调
 */
export const AuditTable = ({ data, loading, pagination, onDetail }: AuditTableProps) => {
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
      key: 'risk_level',
      width: 110,
      render: (_, audit) => <RiskLevelTag audit={audit} />,
    },
    {
      title: '模块',
      key: 'module',
      width: 130,
      render: (_, audit) => (
        <div className="flex flex-col leading-5">
          <span className="font-mono text-[12px] text-fg-2">{audit.module}</span>
          <span className="text-[12px] text-fg-3">{audit.sub_module}</span>
        </div>
      ),
    },
    {
      title: '事件',
      key: 'event',
      width: 200,
      render: (_, audit) => (
        <div className="flex flex-col leading-5">
          <span className="font-mono text-[12px] text-fg-2">{audit.event}</span>
          <span className="text-[12px] text-fg-3">{audit.action}</span>
        </div>
      ),
    },
    {
      title: '对象',
      key: 'object',
      width: 150,
      render: (_, audit) => {
        const { object_name: name, object_type: type, object_id: id } = audit
        if (!name && !type && id == null) {
          return <span className="text-fg-3">{EMPTY_TEXT}</span>
        }
        return (
          <div className="flex flex-col leading-5">
            {name && <span className="text-[13px] text-fg-2">{name}</span>}
            <span className="text-[12px] text-fg-3">
              {type ?? EMPTY_TEXT}
              {id != null && ` #${id}`}
            </span>
          </div>
        )
      },
    },
    {
      title: '操作人',
      key: 'operator',
      width: 120,
      render: (_, audit) =>
        audit.operator_name ? (
          <span>{audit.operator_name}</span>
        ) : (
          <span className="text-fg-3">{EMPTY_TEXT}</span>
        ),
    },
    {
      title: '描述',
      dataIndex: 'message',
      ellipsis: { showTitle: true },
    },
    {
      title: '操作',
      key: 'actions',
      width: 90,
      fixed: 'end',
      render: (_, audit) => (
        <div className="-ms-2">
          <Button type="link" size="small" onClick={() => onDetail(audit)}>
            详情
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
        scroll={{ x: 1120 }}
      />
    </div>
  )
}
