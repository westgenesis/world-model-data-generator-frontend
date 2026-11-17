import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { FormRule } from 'antd'
import { Alert, App, Form, Input, Modal } from 'antd'
import type { CurrentUser, PasswordChangeInput } from '@/api/auth'
import { changePassword, currentUserQueryOptions, passwordChangeSchema } from '@/api/auth'
import { zodRule } from '@/lib/form'
import { getErrorMessage } from '@/lib/http'
import { useAuthStore } from '@/stores/auth-store'

/** 表单值：在接口字段之外增加确认密码（仅前端校验，不提交） */
type ChangePasswordFormValues = PasswordChangeInput & { confirm_password: string }

/** 确认密码校验：必填且与新密码一致 */
const confirmRule: FormRule = ({ getFieldValue }) => ({
  validator: async (_rule, value: string) => {
    if (!value) throw new Error('请再次输入新密码')
    if (value !== getFieldValue('new_password')) throw new Error('两次输入的密码不一致')
  },
})

interface ChangePasswordModalProps {
  /** 是否打开 */
  open: boolean
  /** 关闭弹窗（强制修改模式下不会触发） */
  onClose: () => void
  /** 强制修改：用于首次登录或密码被重置的场景，不允许关闭 */
  forced?: boolean
}

/**
 * 修改密码弹窗：校验原密码与新密码，成功后保存后端签发的新令牌。
 * 强制修改模式下隐藏取消按钮，且不可通过遮罩、Esc 或关闭图标退出。
 * @param props - 打开状态、关闭回调与是否强制修改
 */
export const ChangePasswordModal = ({
  open,
  onClose,
  forced = false,
}: ChangePasswordModalProps) => {
  const [form] = Form.useForm<ChangePasswordFormValues>()
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const setTokens = useAuthStore((s) => s.setTokens)
  const shape = passwordChangeSchema.shape

  const mutation = useMutation({
    mutationFn: (values: ChangePasswordFormValues) =>
      changePassword(passwordChangeSchema.parse(values)),
    onSuccess: (tokens) => {
      setTokens({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
      })
      // 先本地置为已修改，让强制弹窗立即关闭；随后重新拉取当前用户信息校准
      queryClient.setQueryData<CurrentUser>(currentUserQueryOptions.queryKey, (user) =>
        user ? { ...user, must_change_password: false } : user,
      )
      void queryClient.invalidateQueries({ queryKey: currentUserQueryOptions.queryKey })
      message.success('密码已修改')
      onClose()
    },
    onError: (error) => message.error(getErrorMessage(error, '修改密码失败，请稍后重试')),
  })

  const handleCancel = () => {
    if (forced || mutation.isPending) return
    onClose()
  }

  return (
    <Modal
      open={open}
      title={forced ? '请修改初始密码' : '修改密码'}
      onCancel={handleCancel}
      onOk={() => form.submit()}
      okText="确认修改"
      cancelButtonProps={forced ? { style: { display: 'none' } } : undefined}
      confirmLoading={mutation.isPending}
      closable={!forced}
      maskClosable={!forced}
      keyboard={!forced}
      destroyOnHidden
      width={420}
    >
      {forced && (
        <Alert
          type="warning"
          showIcon
          className="mb-4"
          message="当前账号仍在使用初始密码，请修改密码后继续使用系统。"
        />
      )}
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        preserve={false}
        onFinish={(values) => mutation.mutate(values)}
      >
        <Form.Item
          name="old_password"
          label="原密码"
          rules={[zodRule(shape.old_password)]}
          validateFirst
        >
          <Input.Password autoComplete="current-password" placeholder="请输入当前密码" autoFocus />
        </Form.Item>
        <Form.Item
          name="new_password"
          label="新密码"
          rules={[zodRule(shape.new_password)]}
          validateFirst
        >
          <Input.Password autoComplete="new-password" placeholder="请输入新密码" />
        </Form.Item>
        <Form.Item
          name="confirm_password"
          label="确认新密码"
          dependencies={['new_password']}
          rules={[confirmRule]}
          validateFirst
        >
          <Input.Password autoComplete="new-password" placeholder="请再次输入新密码" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
