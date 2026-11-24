import { useQuery } from '@tanstack/react-query'
import { Alert, Modal, Skeleton, Table } from 'antd'
import type { TableProps } from 'antd'
import { logContextQueryOptions } from '@/api/logs'
import type { LogItem } from '@/api/logs'
import { EnumTag } from '@/components/EnumTag'
import { LogCategory, LogLevel, LogSource } from '@/constants/enums'
import { formatDateTime } from '@/lib/format'
import { getErrorMessage } from '@/lib/http'

interface LogContextModalProps {
  open: boolean
  /** 当前日志（关闭时保留，避免动画期间内容闪变） */
  log?: LogItem
  onClose: () => void
}

/**
 * 链路上下文弹窗：展示同一 TraceID 下的全部日志，并高亮当前日志
 * @param props - 打开状态、当前日志与关闭回调
 */
export const LogContextModal = ({ open, log, onClose }: LogContextModalProps) => {
  const { data, isPending, isError, error } = useQuery(logContextQueryOptions(log?.log_id, open))

  const columns: TableProps<LogItem>['columns'] = [
    {
      title: '时间',
      dataIndex: 'ts',
      width: 130,
      render: (value: string) => (
        <span className="text-fg-2 tabular-nums">{formatDateTime(value, 'HH:mm:ss.SSS')}</span>
      ),
    },
    {
      title: '级别',
      dataIndex: 'level',
      width: 100,
      render: (value: LogItem['level']) => <EnumTag enumDef={LogLevel} value={value} />,
    },
    {
      title: '分类',
      dataIndex: 'category',
      width: 105,
      render: (value: LogItem['category']) => <EnumTag enumDef={LogCategory} value={value} />,
    },
    {
      title: '模块',
      dataIndex: 'module',
      width: 100,
      render: (value: string) => <span className="font-mono text-[13px] text-fg-2">{value}</span>,
    },
    {
      title: '来源',
      dataIndex: 'source',
      width: 105,
      render: (value: LogItem['source']) => <EnumTag enumDef={LogSource} value={value} />,
    },
    {
      title: '内容',
      dataIndex: 'message',
      ellipsis: { showTitle: true },
    },
  ]

  return (
    <Modal
      open={open}
      title={log?.trace_id ? `链路上下文 · ${log.trace_id}` : '链路上下文'}
      width={960}
      footer={null}
      destroyOnHidden
      onCancel={onClose}
    >
      {isError ? (
        <Alert type="error" showIcon message={getErrorMessage(error, '加载链路日志失败')} />
      ) : isPending || !data ? (
        <Skeleton active />
      ) : (
        <Table<LogItem>
          rowKey="log_id"
          size="small"
          columns={columns}
          dataSource={data}
          pagination={false}
          scroll={{ x: 820, y: 420 }}
          rowClassName={(record) =>
            record.log_id === log?.log_id ? 'bg-primary-soft font-medium' : ''
          }
        />
      )}
    </Modal>
  )
}
