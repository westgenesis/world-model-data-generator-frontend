import { useQuery } from '@tanstack/react-query'
import { Alert, Button, Descriptions, Modal, Skeleton } from 'antd'
import { ShieldCheck } from 'lucide-react'
import type { AuditDetail, AuditItem } from '@/api/audits'
import { auditDetailQueryOptions } from '@/api/audits'
import { EnumTag } from '@/components/EnumTag'
import { AuditRiskLevel, AuditStatus, LogSource } from '@/constants/enums'
import { PERMISSION } from '@/constants/permissions'
import { usePermissions } from '@/hooks/use-permissions'
import { EMPTY_TEXT, formatDateTime } from '@/lib/format'
import { getErrorMessage } from '@/lib/http'

interface AuditDetailModalProps {
  open: boolean
  /** 要查看的审计记录（关闭时保留，避免动画期间内容闪变） */
  audit?: AuditItem
  onClose: () => void
  /** 打开处置弹窗 */
  onHandle: (audit: AuditDetail) => void
}

/**
 * 安全审计详情弹窗：展示完整字段、事件字段与处置信息
 * @param props - 打开状态、审计记录、关闭与处置回调
 */
export const AuditDetailModal = ({ open, audit, onClose, onHandle }: AuditDetailModalProps) => {
  const { has } = usePermissions()
  const canHandle = has(PERMISSION.auditHandle)
  const { data, isPending, isError, error } = useQuery(
    auditDetailQueryOptions(audit?.audit_id, open),
  )

  return (
    <Modal
      open={open}
      title="安全审计详情"
      width={820}
      destroyOnHidden
      onCancel={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>关闭</Button>
          {canHandle && (
            <Button
              type="primary"
              disabled={!data}
              icon={<ShieldCheck size={15} strokeWidth={1.75} />}
              onClick={() => data && onHandle(data)}
            >
              处置
            </Button>
          )}
        </div>
      }
    >
      {isError ? (
        <Alert type="error" showIcon message={getErrorMessage(error, '加载安全审计详情失败')} />
      ) : isPending || !data ? (
        <Skeleton active />
      ) : (
        <div className="flex flex-col gap-4">
          <Descriptions
            size="small"
            bordered
            column={2}
            items={[
              { key: 'audit_id', label: '审计 ID', children: data.audit_id },
              {
                key: 'ts',
                label: '时间',
                children: formatDateTime(data.ts, 'YYYY-MM-DD HH:mm:ss'),
              },
              {
                key: 'risk_level',
                label: '风险等级',
                children: <EnumTag enumDef={AuditRiskLevel} value={data.risk_level} />,
              },
              {
                key: 'status',
                label: '状态',
                children: <EnumTag enumDef={AuditStatus} value={data.status} />,
              },
              {
                key: 'security_type',
                label: '事件类型',
                children: (
                  <span>
                    {data.security_name || data.security_type}
                    <span className="ms-1.5 font-mono text-[12px] text-fg-3">
                      {data.security_type}
                    </span>
                  </span>
                ),
              },
              {
                key: 'event',
                label: '日志事件',
                children: <span className="font-mono">{data.event}</span>,
              },
              {
                key: 'operator',
                label: '操作人',
                children: data.operator
                  ? `${data.operator.full_name || data.operator.username}（${data.operator.username}）`
                  : EMPTY_TEXT,
              },
              {
                key: 'operator_id',
                label: '操作人 ID',
                children: data.operator_id ?? EMPTY_TEXT,
              },
              {
                key: 'source',
                label: '来源',
                children: <EnumTag enumDef={LogSource} value={data.source} />,
              },
              {
                key: 'project_id',
                label: '项目 ID',
                children: data.project_id ?? EMPTY_TEXT,
              },
              {
                key: 'trace_id',
                label: 'TraceID',
                children: data.trace_id ? (
                  <span className="font-mono">{data.trace_id}</span>
                ) : (
                  EMPTY_TEXT
                ),
              },
              {
                key: 'log_id',
                label: '日志 ID',
                children: data.log_id ?? EMPTY_TEXT,
              },
              {
                key: 'created_at',
                label: '创建时间',
                children: formatDateTime(data.created_at, 'YYYY-MM-DD HH:mm:ss'),
              },
              {
                key: 'handled_at',
                label: '处置时间',
                children: formatDateTime(data.handled_at, 'YYYY-MM-DD HH:mm:ss'),
              },
              {
                key: 'handler',
                label: '处置人',
                children: data.handler
                  ? `${data.handler.full_name || data.handler.username}（${data.handler.username}）`
                  : EMPTY_TEXT,
              },
              {
                key: 'handler_id',
                label: '处置人 ID',
                children: data.handler_id ?? EMPTY_TEXT,
              },
            ]}
          />

          <section>
            <h3 className="mb-2 text-[13px] font-semibold text-fg">描述</h3>
            <div className="rounded-lg bg-sunken p-3 text-[13px] leading-6 break-all whitespace-pre-wrap text-fg-2">
              {data.description}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-[13px] font-semibold text-fg">处置备注</h3>
            <div className="rounded-lg bg-sunken p-3 text-[13px] leading-6 break-all whitespace-pre-wrap text-fg-2">
              {data.handle_note || EMPTY_TEXT}
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
        </div>
      )}
    </Modal>
  )
}
