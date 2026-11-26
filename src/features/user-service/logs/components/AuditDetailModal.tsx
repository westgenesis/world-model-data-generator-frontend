import { useQuery } from '@tanstack/react-query'
import { Alert, Descriptions, Modal, Skeleton } from 'antd'
import type { AuditItem } from '@/api/audits'
import { auditDetailQueryOptions } from '@/api/audits'
import { EnumTag } from '@/components/EnumTag'
import { LogSource } from '@/constants/enums'
import { EMPTY_TEXT, formatDateTime } from '@/lib/format'
import { getErrorMessage } from '@/lib/http'
import { RiskLevelTag } from './RiskLevelTag'

interface AuditDetailModalProps {
  open: boolean
  /** 要查看的日志记录（关闭时保留，避免动画期间内容闪变） */
  audit?: AuditItem
  onClose: () => void
}

/**
 * 日志详情弹窗：展示完整字段与事件详情
 * @param props - 打开状态、日志记录与关闭回调
 */
export const AuditDetailModal = ({ open, audit, onClose }: AuditDetailModalProps) => {
  const { data, isPending, isError, error } = useQuery(
    auditDetailQueryOptions(audit?.audit_id, open),
  )

  return (
    <Modal
      open={open}
      title="日志详情"
      width={820}
      destroyOnHidden
      onCancel={onClose}
      footer={null}
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
              { key: 'audit_id', label: '日志 ID', children: data.audit_id },
              {
                key: 'ts',
                label: '时间',
                children: formatDateTime(data.ts, 'YYYY-MM-DD HH:mm:ss'),
              },
              {
                key: 'risk_level',
                label: '风险等级',
                children: <RiskLevelTag audit={data} />,
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
                key: 'sub_module',
                label: '子模块',
                children: <span className="font-mono">{data.sub_module}</span>,
              },
              { key: 'action', label: '动作', children: data.action },
              {
                key: 'event',
                label: '事件 key',
                children: <span className="font-mono">{data.event}</span>,
                span: 2,
              },
              {
                key: 'object_type',
                label: '对象类型',
                children: data.object_type ?? EMPTY_TEXT,
              },
              { key: 'object_id', label: '对象 ID', children: data.object_id ?? EMPTY_TEXT },
              {
                key: 'object_name',
                label: '对象名称',
                children: data.object_name ?? EMPTY_TEXT,
              },
              {
                key: 'operator',
                label: '操作人',
                children: data.operator_name ?? EMPTY_TEXT,
              },
              {
                key: 'operator_id',
                label: '操作人 ID',
                children: data.operator_id ?? EMPTY_TEXT,
              },
              { key: 'ip', label: '客户端 IP', children: data.ip ?? EMPTY_TEXT },
              { key: 'project_id', label: '项目 ID', children: data.project_id ?? EMPTY_TEXT },
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
            ]}
          />

          <section>
            <h3 className="mb-2 text-[13px] font-semibold text-fg">描述</h3>
            <div className="rounded-lg bg-sunken p-3 text-[13px] leading-6 break-all whitespace-pre-wrap text-fg-2">
              {data.message}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-[13px] font-semibold text-fg">事件详情</h3>
            {data.detail ? (
              <pre className="max-h-64 overflow-auto rounded-lg bg-sunken p-3 font-mono text-[12px] leading-5 text-fg-2">
                {JSON.stringify(data.detail, null, 2)}
              </pre>
            ) : (
              <div className="text-[13px] text-fg-3">{EMPTY_TEXT}</div>
            )}
          </section>
        </div>
      )}
    </Modal>
  )
}
