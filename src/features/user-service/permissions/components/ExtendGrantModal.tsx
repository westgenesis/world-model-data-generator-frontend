import { DatePicker, Form, Modal } from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import type { UserGrant, UserGrantBatch } from '@/api/user-grants'
import { extendUserGrants, USER_GRANTS_QUERY_KEY } from '@/api/user-grants'
import { useActionMutation } from '@/hooks/use-action-mutation'

interface ExtendGrantModalProps {
  open: boolean
  /** 需要延期的授权记录（单条或批量） */
  grants: UserGrant[]
  onClose: () => void
  /** 延期成功后的回调 */
  onSuccess?: () => void
}

/** 延期表单值 */
interface ExtendFormValues {
  effective_to: Dayjs
}

/**
 * 延期授权弹窗：为一条或多条授权设置新的失效时间
 * @param props - 打开状态、目标授权与回调
 */
export const ExtendGrantModal = ({ open, grants, onClose, onSuccess }: ExtendGrantModalProps) => {
  const [form] = Form.useForm<ExtendFormValues>()

  /** 涉及的用户摘要，超过 3 人时折叠 */
  const userSummary = useMemo(() => {
    const names = [...new Set(grants.map((grant) => grant.full_name ?? grant.username))]
    if (names.length === 0) return ''
    return names.length > 3
      ? `${names.slice(0, 3).join('、')} 等 ${names.length} 人`
      : names.join('、')
  }, [grants])

  const mutation = useActionMutation<ExtendFormValues, UserGrantBatch>({
    mutationFn: ({ effective_to }) =>
      extendUserGrants(
        grants.map((grant) => grant.grant_id),
        effective_to.toISOString(),
      ),
    successMessage: (result) => `已延期 ${result.affected} 条授权`,
    invalidateKeys: [USER_GRANTS_QUERY_KEY],
    onSuccess: () => {
      onSuccess?.()
      onClose()
    },
  })

  return (
    <Modal
      open={open}
      title={grants.length > 1 ? `批量延期 · ${grants.length} 条授权` : '延期授权'}
      okText="确认延期"
      cancelText="取消"
      confirmLoading={mutation.isPending}
      destroyOnHidden
      onOk={() => form.submit()}
      onCancel={onClose}
      afterClose={() => form.resetFields()}
    >
      <p className="mb-4 text-fg-2">
        目标：{userSummary || '—'}
        {grants.length > 1 && `，共 ${grants.length} 条授权`}
      </p>
      <Form<ExtendFormValues>
        form={form}
        layout="vertical"
        requiredMark
        initialValues={{ effective_to: dayjs().add(3, 'month').endOf('day') }}
        onFinish={(values) => mutation.mutate(values)}
      >
        <Form.Item
          name="effective_to"
          label="新的失效时间"
          required
          rules={[
            { required: true, message: '请选择新的失效时间' },
            {
              validator: async (_rule, value: Dayjs | undefined) => {
                if (value && !value.isAfter(dayjs())) {
                  throw new Error('新的失效时间必须晚于当前时间')
                }
              },
            },
          ]}
        >
          <DatePicker
            className="w-full"
            showTime={{ format: 'HH:mm' }}
            format="YYYY-MM-DD HH:mm"
            disabledDate={(date) => date.isBefore(dayjs(), 'day')}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
