import { Checkbox, Form, Input, Radio, Select } from 'antd'
import type { User, UserCreateInput, UserUpdateInput } from '@/api/users'
import {
  createUser,
  updateUser,
  USERS_QUERY_KEY,
  userCreateSchema,
  userUpdateSchema,
} from '@/api/users'
import { FormDrawer } from '@/components/FormDrawer'
import { Department, UserStatus } from '@/constants/enums'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { zodRule } from '@/lib/form'

interface UserFormDrawerProps {
  open: boolean
  /** 编辑的用户；为空时为新增 */
  user?: User
  onClose: () => void
}

/** 新增与编辑共用的表单值 */
type UserFormValues = UserCreateInput & UserUpdateInput

/** 新增用户的表单默认值 */
const CREATE_DEFAULTS: Partial<UserFormValues> = {
  forceResetPassword: true,
  sendAccountEmail: false,
}

/**
 * 新增 / 编辑用户抽屉
 * @param props - 打开状态、编辑对象与关闭回调
 */
export const UserFormDrawer = ({ open, user, onClose }: UserFormDrawerProps) => {
  const isEdit = Boolean(user)
  const shape = userCreateSchema.shape

  const mutation = useActionMutation({
    mutationFn: (values: UserFormValues) =>
      user
        ? updateUser(user.id, userUpdateSchema.parse(values))
        : createUser(userCreateSchema.parse(values)),
    successMessage: isEdit ? '用户信息已更新' : '用户已创建',
    invalidateKeys: [USERS_QUERY_KEY],
    onSuccess: onClose,
  })

  return (
    <FormDrawer<UserFormValues>
      open={open}
      title={isEdit ? `编辑用户 · ${user?.name}` : '新增用户'}
      onClose={onClose}
      onSubmit={(values) => mutation.mutate(values)}
      submitting={mutation.isPending}
      initialValues={
        user ? { ...user, phone: user.phone ?? '', email: user.email ?? '' } : CREATE_DEFAULTS
      }
    >
      <Form.Item name="name" label="姓名" required rules={[zodRule(shape.name)]}>
        <Input placeholder="请输入真实姓名" />
      </Form.Item>
      <Form.Item
        name="account"
        label="登录账号"
        required
        rules={isEdit ? [] : [zodRule(shape.account)]}
      >
        <Input placeholder="建议使用拼音或工号" disabled={isEdit} />
      </Form.Item>
      <Form.Item name="phone" label="手机号" rules={[zodRule(shape.phone)]}>
        <Input placeholder="用于接收安全通知" />
      </Form.Item>
      <Form.Item name="email" label="邮箱" rules={[zodRule(shape.email)]}>
        <Input placeholder="example@company.com" />
      </Form.Item>
      <Form.Item name="department" label="所属部门" required rules={[zodRule(shape.department)]}>
        <Select placeholder="请选择" options={Department.options} />
      </Form.Item>

      {isEdit ? (
        <Form.Item name="status" label="账号状态" className="sm:col-span-2">
          <Radio.Group options={UserStatus.options} />
        </Form.Item>
      ) : (
        <Form.Item label="初始密码" className="sm:col-span-2">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Form.Item name="forceResetPassword" valuePropName="checked" noStyle>
              <Checkbox>首次登录强制修改密码</Checkbox>
            </Form.Item>
            <Form.Item name="sendAccountEmail" valuePropName="checked" noStyle>
              <Checkbox>发送账号信息到邮箱</Checkbox>
            </Form.Item>
          </div>
        </Form.Item>
      )}
    </FormDrawer>
  )
}
