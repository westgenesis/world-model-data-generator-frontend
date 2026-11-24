import { Button, Form, Input, Modal, Radio } from 'antd'
import { useEffect } from 'react'
import type { AuditDetail, AuditItem } from '@/api/audits'
import { AUDITS_QUERY_KEY, handleAudit } from '@/api/audits'
import { EnumTag } from '@/components/EnumTag'
import { AuditHandleStatus, AuditRiskLevel } from '@/constants/enums'
import { useActionMutation } from '@/hooks/use-action-mutation'

/** 处置表单 */
interface HandleFormValues {
  status: AuditHandleStatus
  note?: string
}

interface AuditHandleModalProps {
  open: boolean
  /** 要处置的审计记录（关闭时保留，避免动画期间内容闪变） */
  audit?: AuditItem
  onClose: () => void
}

/**
 * 处置安全审计弹窗：标记已处理 / 标记忽略，可填写处置备注
 * @param props - 打开状态、审计记录与关闭回调
 */
export const AuditHandleModal = ({ open, audit, onClose }: AuditHandleModalProps) => {
  const [form] = Form.useForm<HandleFormValues>()

  const handle = useActionMutation<HandleFormValues, AuditDetail>({
    mutationFn: (values) => {
      if (!audit) return Promise.reject(new Error('缺少审计记录'))
      return handleAudit(audit.audit_id, {
        status: values.status,
        note: values.note?.trim() || null,
      })
    },
    successMessage: (_, values) =>
      values.status === 'handled' ? '已标记为已处理' : '已标记为忽略',
    invalidateKeys: [AUDITS_QUERY_KEY],
    onSuccess: onClose,
  })

  useEffect(() => {
    if (!open) return
    form.setFieldsValue({
      status: audit?.status === 'ignored' ? 'ignored' : 'handled',
      note: '',
    })
  }, [open, audit, form])

  return (
    <Modal
      open={open}
      title="处置安全审计"
      width={520}
      destroyOnHidden
      onCancel={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={handle.isPending} onClick={() => form.submit()}>
            确认处置
          </Button>
        </div>
      }
    >
      {audit && (
        <div className="rounded-lg bg-sunken p-3">
          <div className="flex items-center gap-2">
            <EnumTag enumDef={AuditRiskLevel} value={audit.risk_level} />
            <span className="text-[13px] font-medium text-fg">
              {audit.security_name || audit.security_type}
            </span>
          </div>
          <p className="mt-1 text-[13px] leading-5 text-fg-2">{audit.description}</p>
        </div>
      )}

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        className="mt-4"
        onFinish={(values) => handle.mutate(values)}
      >
        <Form.Item
          name="status"
          label="处置结果"
          rules={[{ required: true, message: '请选择处置结果' }]}
        >
          <Radio.Group optionType="button" buttonStyle="solid">
            {AuditHandleStatus.items.map((item) => (
              <Radio.Button key={item.value} value={item.value}>
                {item.label}
              </Radio.Button>
            ))}
          </Radio.Group>
        </Form.Item>
        <Form.Item name="note" label="处置备注" rules={[{ max: 500, message: '备注最多 500 字' }]}>
          <Input.TextArea
            rows={3}
            maxLength={500}
            showCount
            placeholder="记录处置措施或忽略原因（选填）"
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
