import { App, Checkbox, Form, Input } from 'antd'
import type { User, UserCreated, UserCreateValues, UserUpdateValues } from '@/api/users'
import {
  createUser,
  updateUser,
  USERS_QUERY_KEY,
  userCreateSchema,
  userUpdateSchema,
} from '@/api/users'
import { FormDrawer } from '@/components/FormDrawer'
import { DepartmentSelect } from '@/features/user-service/components/DepartmentSelect'
import { RoleSelect } from '@/features/user-service/components/RoleSelect'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { zodRule } from '@/lib/form'

interface UserFormDrawerProps {
  open: boolean
  /** 编辑的用户；为空时为新增 */
  user?: User
  onClose: () => void
}

/** 新增与编辑共用的表单值；编辑时可清空部门归属 */
type UserFormValues = Omit<UserCreateValues & UserUpdateValues, 'department_id'> & {
  department_id: number | null
}

/** 新增用户的表单默认值 */
const CREATE_DEFAULTS: Partial<UserFormValues> = {
  username: '',
  full_name: '',
  phone: '',
  email: '',
  password: '',
  must_change_password: true,
  send_account_info_to_email: false,
}

/**
 * 新增 / 编辑用户抽屉
 * @param props - 打开状态、编辑对象与关闭回调
 */
export const UserFormDrawer = ({ open, user, onClose }: UserFormDrawerProps) => {
  const { modal } = App.useApp()
  const isEdit = Boolean(user)
  const createShape = userCreateSchema.shape
  const updateShape = userUpdateSchema.shape

  const mutation = useActionMutation<UserFormValues, User | UserCreated>({
    mutationFn: (values) => {
      if (user) {
        return updateUser(user.user_id, {
          full_name: values.full_name,
          phone: values.phone.trim() || null,
          email: values.email.trim() || null,
          department_id: values.department_id ?? null,
          role_id: values.role_id ?? null,
        })
      }
      if (values.department_id == null) {
        return Promise.reject(new Error('请选择所属部门'))
      }
      return createUser({
        username: values.username,
        full_name: values.full_name,
        phone: values.phone.trim() || null,
        email: values.email.trim() || null,
        department_id: values.department_id,
        role_id: values.role_id ?? null,
        password: values.password.trim() || null,
        must_change_password: values.must_change_password,
        send_account_info_to_email: values.send_account_info_to_email,
      })
    },
    successMessage: isEdit ? '用户信息已更新' : '用户已创建',
    invalidateKeys: [USERS_QUERY_KEY],
    onSuccess: (data) => {
      if (!isEdit && 'initial_password' in data && data.initial_password) {
        modal.success({
          title: '用户已创建',
          content: (
            <div className="space-y-1">
              <p>账号：{data.username}</p>
              <p>
                初始密码：<span className="font-mono">{data.initial_password}</span>
              </p>
              <p className="text-fg-2">初始密码只显示这一次，请及时告知用户。</p>
            </div>
          ),
        })
      }
      onClose()
    },
  })

  return (
    <FormDrawer<UserFormValues>
      open={open}
      title={isEdit ? `编辑用户 · ${user?.full_name}` : '新增用户'}
      onClose={onClose}
      onSubmit={(values) => mutation.mutate(values)}
      submitting={mutation.isPending}
      initialValues={
        user
          ? {
              username: user.username,
              full_name: user.full_name,
              phone: user.phone ?? '',
              email: user.email ?? '',
              department_id: user.department?.department_id ?? null,
              role_id: user.role?.role_id,
            }
          : CREATE_DEFAULTS
      }
      submitText={isEdit ? '保存' : '创建'}
    >
      <Form.Item
        name="username"
        label="登录账号"
        required={!isEdit}
        rules={isEdit ? [] : [zodRule(createShape.username)]}
        extra={isEdit ? '账号创建后不可修改' : undefined}
      >
        <Input placeholder="建议使用拼音或工号" disabled={isEdit} />
      </Form.Item>
      <Form.Item name="full_name" label="姓名" required rules={[zodRule(createShape.full_name)]}>
        <Input placeholder="请输入真实姓名" />
      </Form.Item>
      <Form.Item
        name="department_id"
        label="部门"
        required={!isEdit}
        rules={[zodRule(isEdit ? updateShape.department_id : createShape.department_id)]}
      >
        <DepartmentSelect allowClear={isEdit} />
      </Form.Item>
      <Form.Item name="role_id" label="角色">
        <RoleSelect allowClear />
      </Form.Item>
      <Form.Item name="phone" label="手机号" rules={[zodRule(createShape.phone)]}>
        <Input placeholder="用于接收安全通知" />
      </Form.Item>
      <Form.Item name="email" label="邮箱" rules={[zodRule(createShape.email)]}>
        <Input placeholder="example@company.com" />
      </Form.Item>

      {!isEdit && (
        <>
          <Form.Item
            name="password"
            label="初始密码"
            rules={[zodRule(createShape.password)]}
            className="sm:col-span-2"
          >
            <Input.Password placeholder="留空由系统生成" maxLength={64} />
          </Form.Item>
          <Form.Item label="账号设置" className="sm:col-span-2">
            <div className="flex flex-col gap-2">
              <Form.Item name="must_change_password" valuePropName="checked" noStyle>
                <Checkbox>首次登录强制修改密码</Checkbox>
              </Form.Item>
              <Form.Item name="send_account_info_to_email" valuePropName="checked" noStyle>
                <Checkbox>把账号信息发送到邮箱</Checkbox>
              </Form.Item>
            </div>
          </Form.Item>
        </>
      )}
    </FormDrawer>
  )
}
