import type { TablePaginationConfig, TableProps } from 'antd'
import { Button, Table } from 'antd'
import type { LogItem } from '@/api/logs'
import { EnumTag } from '@/components/EnumTag'
import { LogCategory, LogLevel, LogSource } from '@/constants/enums'
import { EMPTY_TEXT, formatDateTime } from '@/lib/format'

interface LogTableProps {
  data: LogItem[]
  loading: boolean
  pagination: TablePaginationConfig
  /** 查看日志详情 */
  onDetail: (log: LogItem) => void
  /** 查看同一链路的日志 */
  onContext: (log: LogItem) => void
}

/**
 * 日志列表表格
 * @param props - 数据、分页与行操作回调
 */
export const LogTable = ({ data, loading, pagination, onDetail, onContext }: LogTableProps) => {
  const columns: TableProps<LogItem>['columns'] = [
    {
      title: '时间',
      dataIndex: 'ts',
      width: 185,
      render: (value: string) => (
        <span className="text-fg-2 tabular-nums">
          {formatDateTime(value, 'YYYY-MM-DD HH:mm:ss')}
        </span>
      ),
    },
    {
      title: '级别',
      dataIndex: 'level',
      width: 110,
      render: (value: LogItem['level']) => <EnumTag enumDef={LogLevel} value={value} />,
    },
    {
      title: '分类',
      dataIndex: 'category',
      width: 110,
      render: (value: LogItem['category']) => <EnumTag enumDef={LogCategory} value={value} />,
    },
    {
      title: '模块',
      dataIndex: 'module',
      width: 110,
      render: (value: string) => <span className="font-mono text-[13px] text-fg-2">{value}</span>,
    },
    {
      title: '来源',
      dataIndex: 'source',
      width: 110,
      render: (value: LogItem['source']) => <EnumTag enumDef={LogSource} value={value} />,
    },
    {
      title: '内容',
      dataIndex: 'message',
      ellipsis: { showTitle: true },
    },
    {
      title: '操作人',
      dataIndex: 'operator_name',
      width: 120,
      render: (value: string) => value || EMPTY_TEXT,
    },
    {
      title: 'TraceID',
      dataIndex: 'trace_id',
      width: 150,
      ellipsis: { showTitle: true },
      render: (value: string | null) =>
        value ? <span className="font-mono text-[13px] text-fg-2">{value}</span> : EMPTY_TEXT,
    },
    {
      title: '操作',
      key: 'actions',
      width: 130,
      fixed: 'end',
      render: (_, log) => (
        <div className="-ms-2 flex items-center">
          <Button type="link" size="small" onClick={() => onDetail(log)}>
            详情
          </Button>
          <Button type="link" size="small" onClick={() => onContext(log)}>
            上下文
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-card shadow-card">
      <Table<LogItem>
        rowKey="log_id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ ...pagination, className: 'px-4' }}
        scroll={{ x: 1180 }}
      />
    </div>
  )
}
