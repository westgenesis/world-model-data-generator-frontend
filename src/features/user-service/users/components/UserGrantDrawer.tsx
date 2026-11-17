import { useQuery } from '@tanstack/react-query'
import { Alert, DatePicker, Form, Input, Select } from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import { permissionListQueryOptions } from '@/api/permissions'
import { createUserGrant } from '@/api/user-grants'
import type { User } from '@/api/users'
import { FormDrawer } from '@/components/FormDrawer'
import { useActionMutation } from '@/hooks/use-action-mutation'

interface UserGrantDrawerProps {
  open: boolean
  /** 授权用户 */
  user?: User
  onClose: () => void
}

/** 授权表单值：有效期使用日期范围选择器 */
interface GrantFormValues {
  permission_codes: string[]
  period: [Dayjs, Dayjs]
  reason: string
}

/**
 * 用户授权抽屉：为用户追加有时效的临时权限
 * @param props - 打开状态、授权用户与关闭回调
 */
export const UserGrantDrawer = ({ open, user, onClose }: UserGrantDrawerProps) => {
  const { data: permissions = [], isPending } = useQuery({
    ...permissionListQueryOptions,
    enabled: open,
  })

  const options = useMemo(
    () =>
      permissions
        .filter((permission) => !permission.is_orphan)
        .map((permission) => ({
          value: permission.code,
          label: `${permission.name}（${permission.code}）`,
        })),
    [permissions],
  )

  const mutation = useActionMutation<GrantFormValues>({
    mutationFn: ({ permission_codes, period, reason }) =>
      createUserGrant({
        user_id: user!.user_id,
        permission_codes,
        effective_from: period[0].startOf('day').toISOString(),
        effective_to: period[1].endOf('day').toISOString(),
        reason: reason.trim() || null,
      }),
    successMessage: '授权成功',
    onSuccess: onClose,
  })

  return (
    <FormDrawer<GrantFormValues>
      open={open}
      title={`用户授权 · ${user?.full_name ?? ''}`}
      onClose={onClose}
      onSubmit={(values) => mutation.mutate(values)}
      submitting={mutation.isPending}
      submitText="确认授权"
      initialValues={{
        permission_codes: [],
        period: [dayjs(), dayjs().add(3, 'month')],
        reason: '',
      }}
      footer={<Alert type="info" showIcon title="附加权限仅在有效期内生效，到期自动收回。" />}
    >
      <Form.Item
        name="permission_codes"
        label="附加权限"
        required
        rules={[{ required: true, message: '请选择附加权限' }]}
        className="sm:col-span-2"
      >
        <Select
          mode="multiple"
          placeholder="请选择"
          showSearch={{ optionFilterProp: 'label' }}
          loading={isPending}
          options={options}
        />
      </Form.Item>
      <Form.Item
        name="period"
        label="有效期"
        required
        rules={[{ required: true, message: '请选择有效期' }]}
        className="sm:col-span-2"
      >
        <DatePicker.RangePicker
          className="w-full"
          disabledDate={(date) => date.isBefore(dayjs(), 'day')}
        />
      </Form.Item>
      <Form.Item name="reason" label="授权原因" className="sm:col-span-2">
        <Input placeholder="简要说明授权原因，便于审计" maxLength={255} />
      </Form.Item>
    </FormDrawer>
  )
}
