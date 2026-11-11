import { Alert, DatePicker, Form, Input, Select } from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import type { User } from '@/api/users'
import { grantUserPermission, userGrantSchema } from '@/api/users'
import { FormDrawer } from '@/components/FormDrawer'
import { ExtraPermission } from '@/constants/enums'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { zodRule } from '@/lib/form'

interface UserGrantDrawerProps {
  open: boolean
  user?: User
  onClose: () => void
}

/** 授权表单值：有效期使用日期范围选择器 */
interface GrantFormValues {
  permission: ExtraPermission
  period: [Dayjs, Dayjs]
  reason: string
}

/**
 * 用户授权抽屉：授予有时效的附加权限
 * @param props - 打开状态、授权用户与关闭回调
 */
export const UserGrantDrawer = ({ open, user, onClose }: UserGrantDrawerProps) => {
  const shape = userGrantSchema.shape

  const mutation = useActionMutation({
    mutationFn: ({ permission, period, reason }: GrantFormValues) =>
      grantUserPermission(user!.id, {
        permission,
        startAt: period[0].startOf('day').toISOString(),
        endAt: period[1].endOf('day').toISOString(),
        reason,
      }),
    successMessage: '授权成功',
    onSuccess: onClose,
  })

  return (
    <FormDrawer<GrantFormValues>
      open={open}
      title={`用户授权 · ${user?.name ?? ''}`}
      onClose={onClose}
      onSubmit={(values) => mutation.mutate(values)}
      submitting={mutation.isPending}
      submitText="确认授权"
      initialValues={{ period: [dayjs(), dayjs().add(3, 'month')] }}
      footer={<Alert type="info" showIcon title="附加权限仅在有效期内生效，到期自动收回。" />}
    >
      <Form.Item name="permission" label="附加权限" required rules={[zodRule(shape.permission)]}>
        <Select placeholder="请选择" options={ExtraPermission.options} />
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
      <Form.Item
        name="reason"
        label="授权原因"
        required
        rules={[zodRule(shape.reason)]}
        className="sm:col-span-2"
      >
        <Input placeholder="简要说明授权原因，便于审计" />
      </Form.Item>
    </FormDrawer>
  )
}
