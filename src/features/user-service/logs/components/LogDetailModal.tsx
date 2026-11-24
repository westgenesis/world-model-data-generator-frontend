import { useQuery } from '@tanstack/react-query'
import { Alert, Descriptions, Modal, Skeleton } from 'antd'
import { logDetailQueryOptions } from '@/api/logs'
import type { LogItem } from '@/api/logs'
import { EnumTag } from '@/components/EnumTag'
import { LogCategory, LogLevel, LogSource } from '@/constants/enums'
import { EMPTY_TEXT, formatBytes, formatDateTime } from '@/lib/format'
import { getErrorMessage } from '@/lib/http'

interface LogDetailModalProps {
  open: boolean
  /** 要查看的日志（关闭时保留，避免动画期间内容闪变） */
  log?: LogItem
  onClose: () => void
}

/**
 * 日志详情弹窗：展示完整字段、事件字段与异常堆栈
 * @param props - 打开状态、日志与关闭回调
 */
export const LogDetailModal = ({ open, log, onClose }: LogDetailModalProps) => {
  const { data, isPending, isError, error } = useQuery(logDetailQueryOptions(log?.log_id, open))

  return (
    <Modal
      open={open}
      title="日志详情"
      width={820}
      footer={null}
      destroyOnHidden
      onCancel={onClose}
    >
      {isError ? (
        <Alert type="error" showIcon message={getErrorMessage(error, '加载日志详情失败')} />
      ) : isPending || !data ? (
        <Skeleton active />
      ) : (
        <div className="flex flex-col gap-4">
          <Descriptions
            size="small"
            bordered
            column={2}
            items={[
              { key: 'log_id', label: '日志 ID', children: data.log_id },
              {
                key: 'ts',
                label: '时间',
                children: formatDateTime(data.ts, 'YYYY-MM-DD HH:mm:ss.SSS'),
              },
              {
                key: 'level',
                label: '级别',
                children: <EnumTag enumDef={LogLevel} value={data.level} />,
              },
              {
                key: 'category',
                label: '分类',
                children: <EnumTag enumDef={LogCategory} value={data.category} />,
              },
              {
                key: 'source',
                label: '来源',
                children: <EnumTag enumDef={LogSource} value={data.source} />,
              },
              {
                key: 'module',
                label: '模块',
                children: <span className="font-mono">{data.module}</span>,
              },
              {
                key: 'event',
                label: '事件',
                children: <span className="font-mono">{data.event}</span>,
                span: 2,
              },
              { key: 'operator', label: '操作人', children: data.operator_name || EMPTY_TEXT },
              {
                key: 'operator_id',
                label: '操作人 ID',
                children: data.operator_id ?? EMPTY_TEXT,
              },
              {
                key: 'project_id',
                label: '项目 ID',
                children: data.project_id ?? EMPTY_TEXT,
              },
              {
                key: 'job_id',
                label: '任务标识',
                children: data.job_id ? (
                  <span className="font-mono">{data.job_id}</span>
                ) : (
                  EMPTY_TEXT
                ),
              },
              {
                key: 'trace_id',
                label: 'TraceID',
                children: data.trace_id ? (
                  <span className="font-mono">{data.trace_id}</span>
                ) : (
                  EMPTY_TEXT
                ),
                span: 2,
              },
              {
                key: 'size',
                label: '记录体积',
                children: formatBytes(data.size_bytes),
                span: 2,
              },
            ]}
          />

          <section>
            <h3 className="mb-2 text-[13px] font-semibold text-fg">内容</h3>
            <div className="rounded-lg bg-sunken p-3 text-[13px] leading-6 break-all whitespace-pre-wrap text-fg-2">
              {data.message}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-[13px] font-semibold text-fg">事件字段</h3>
            {data.extra ? (
              <pre className="max-h-64 overflow-auto rounded-lg bg-sunken p-3 font-mono text-[12px] leading-5 text-fg-2">
                {JSON.stringify(data.extra, null, 2)}
              </pre>
            ) : (
              <div className="text-[13px] text-fg-3">{EMPTY_TEXT}</div>
            )}
          </section>

          {data.traceback && (
            <section>
              <h3 className="mb-2 text-[13px] font-semibold text-fg">异常堆栈</h3>
              <pre className="max-h-72 overflow-auto rounded-lg bg-danger-soft p-3 font-mono text-[12px] leading-5 break-all whitespace-pre-wrap text-danger">
                {data.traceback}
              </pre>
            </section>
          )}
        </div>
      )}
    </Modal>
  )
}
