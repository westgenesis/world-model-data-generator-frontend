import { useQuery } from '@tanstack/react-query'
import { Alert, DatePicker, Form, Input, Modal } from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { permissionListQueryOptions } from '@/api/permissions'
import { createUserGrant, USER_GRANTS_QUERY_KEY } from '@/api/user-grants'
import type { UserGrant } from '@/api/user-grants'
import { UserSelect } from '@/features/user-service/components/UserSelect'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { PermissionTreeSelect } from './PermissionTreeSelect'

interface GrantFormModalProps {
  open: boolean
  onClose: () => void
}

/** 添加授权表单值：有效期使用日期范围选择器 */
interface GrantFormValues {
  user_id: number
  permission_codes: string[]
  period: [Dayjs, Dayjs]
  reason: string
}

/**
 * 添加授权弹窗：为用户追加有时效的临时权限
 * @param props - 打开状态与关闭回调
 */
export const GrantFormModal = ({ open, onClose }: GrantFormModalProps) => {
  const [form] = Form.useForm<GrantFormValues>()
  const { data: permissions = [], isPending } = useQuery({
    ...permissionListQueryOptions,
    enabled: open,
  })

  const mutation = useActionMutation<GrantFormValues, UserGrant[]>({
    mutationFn: ({ user_id, permission_codes, period, reason }) =>
      createUserGrant({
        user_id,
        permission_codes,
        effective_from: period[0].startOf('day').toISOString(),
        effective_to: period[1].endOf('day').toISOString(),
        reason: reason.trim() || null,
      }),
    successMessage: (grants) => `已添加 ${grants.length} 条授权`,
    invalidateKeys: [USER_GRANTS_QUERY_KEY],
    onSuccess: onClose,
  })

  return (
    <Modal
      open={open}
      title="添加授权"
      width={720}
      okText="确认授权"
      cancelText="取消"
      confirmLoading={mutation.isPending}
      destroyOnHidden
      onOk={() => form.submit()}
      onCancel={onClose}
      afterClose={() => form.resetFields()}
    >
      <Alert
        type="info"
        showIcon
        className="mb-4"
        title="附加权限仅在有效期内生效，到期后自动收回。"
      />
      <Form<GrantFormValues>
        form={form}
        layout="vertical"
        requiredMark
        initialValues={{
          permission_codes: [],
          period: [dayjs(), dayjs().add(3, 'month')],
          reason: '',
        }}
        onFinish={(values) => mutation.mutate(values)}
      >
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <Form.Item
            name="user_id"
            label="用户"
            required
            rules={[{ required: true, message: '请选择用户' }]}
          >
            <UserSelect enabled={open} placeholder="按姓名 / 账号搜索" />
          </Form.Item>
          <Form.Item
            name="period"
            label="有效期"
            required
            rules={[{ required: true, message: '请选择有效期' }]}
          >
            <DatePicker.RangePicker
              className="w-full"
              disabledDate={(date) => date.isBefore(dayjs(), 'day')}
            />
          </Form.Item>
        </div>
        <Form.Item
          name="permission_codes"
          label="附加权限"
          required
          rules={[
            {
              validator: async (_rule, value: string[]) => {
                if (!value?.length) throw new Error('请至少选择一项权限')
              },
            },
          ]}
        >
          <PermissionTreeSelect permissions={permissions} loading={isPending} />
        </Form.Item>
        <Form.Item name="reason" label="授权原因">
          <Input placeholder="简要说明授权原因，便于审计" maxLength={255} showCount />
        </Form.Item>
      </Form>
    </Modal>
  )
}
