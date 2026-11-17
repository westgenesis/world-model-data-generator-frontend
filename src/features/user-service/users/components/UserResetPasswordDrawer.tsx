import { App, Checkbox, Form, Input } from 'antd'
import type { PasswordResetResult, PasswordResetValues, User } from '@/api/users'
import { passwordResetSchema, resetUserPassword, USERS_QUERY_KEY } from '@/api/users'
import { FormDrawer } from '@/components/FormDrawer'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { zodRule } from '@/lib/form'

interface UserResetPasswordDrawerProps {
  open: boolean
  /** 重置密码的用户 */
  user?: User
  onClose: () => void
}

/**
 * 重置用户密码抽屉：留空由服务端生成，生成的密码只展示一次
 * @param props - 打开状态、用户与关闭回调
 */
export const UserResetPasswordDrawer = ({ open, user, onClose }: UserResetPasswordDrawerProps) => {
  const { modal } = App.useApp()
  const shape = passwordResetSchema.shape

  const mutation = useActionMutation<PasswordResetValues, PasswordResetResult>({
    mutationFn: (values) =>
      resetUserPassword(user!.user_id, {
        new_password: values.new_password.trim() || null,
        must_change_password: values.must_change_password,
      }),
    successMessage: false,
    invalidateKeys: [USERS_QUERY_KEY],
    onSuccess: (result) => {
      onClose()
      modal.success({
        title: '密码已重置',
        content: (
          <div className="space-y-1">
            <p>账号：{result.username}</p>
            <p>
              新密码：
              <span className="font-mono">{result.initial_password ?? '（使用你指定的密码）'}</span>
            </p>
            {result.initial_password && (
              <p className="text-fg-2">新密码只显示这一次，请及时告知用户。</p>
            )}
          </div>
        ),
      })
    },
  })

  return (
    <FormDrawer<PasswordResetValues>
      open={open}
      title={`重置密码 · ${user?.full_name ?? ''}`}
      onClose={onClose}
      onSubmit={(values) => mutation.mutate(values)}
      submitting={mutation.isPending}
      submitText="确认重置"
      initialValues={{ new_password: '', must_change_password: true }}
      footer={
        <p className="text-xs text-fg-3">
          重置后该账号此前签发的登录令牌全部失效，用户需要重新登录。
        </p>
      }
    >
      <Form.Item
        name="new_password"
        label="新密码"
        rules={[zodRule(shape.new_password)]}
        className="sm:col-span-2"
      >
        <Input.Password placeholder="留空由系统生成" maxLength={128} />
      </Form.Item>
      <Form.Item
        name="must_change_password"
        label="登录要求"
        valuePropName="checked"
        className="sm:col-span-2"
      >
        <Checkbox>下次登录时强制修改密码</Checkbox>
      </Form.Item>
    </FormDrawer>
  )
}
