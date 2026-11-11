import { useQuery } from '@tanstack/react-query'
import { Alert, DatePicker, Form, Input, Select } from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import type { ProjectMember, ProjectMemberSetting } from '@/api/projects'
import {
  addProjectMembers,
  projectMemberAddSchema,
  PROJECTS_QUERY_KEY,
  updateProjectMember,
} from '@/api/projects'
import { userOptionsQueryOptions } from '@/api/users'
import { FormDrawer } from '@/components/FormDrawer'
import { DataScope, ExpiryReminder, ProjectMemberRole } from '@/constants/enums'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { zodRule } from '@/lib/form'
import { UserPicker } from './UserPicker'

interface ProjectMemberDrawerProps {
  open: boolean
  projectId: string
  /** 编辑的成员；为空时为添加成员 */
  member?: ProjectMember
  /** 项目现有成员，添加时从候选中排除 */
  existingMembers: ProjectMember[]
  onClose: () => void
}

/** 成员表单值：有效期使用日期选择器 */
interface MemberFormValues extends Omit<ProjectMemberSetting, 'expireAt'> {
  userIds: string[]
  expireAt: Dayjs | null
}

/** 添加成员的表单默认值 */
const ADD_DEFAULTS: Partial<MemberFormValues> = {
  userIds: [],
  role: 'algorithm_engineer',
  dataScope: 'synthetic',
  expireAt: null,
  reminder: '7d',
  remark: '',
}

/**
 * 添加 / 编辑项目成员抽屉
 * @param props - 打开状态、项目、编辑对象与关闭回调
 */
export const ProjectMemberDrawer = ({
  open,
  projectId,
  member,
  existingMembers,
  onClose,
}: ProjectMemberDrawerProps) => {
  const isEdit = Boolean(member)
  const shape = projectMemberAddSchema.shape
  const [form] = Form.useForm<MemberFormValues>()
  const selectedIds = Form.useWatch('userIds', form) ?? []

  const { data: users = [], isPending: usersLoading } = useQuery({
    ...userOptionsQueryOptions,
    enabled: open && !isEdit,
  })
  const candidates = users.filter((u) => !existingMembers.some((m) => m.userId === u.id))

  const mutation = useActionMutation({
    mutationFn: ({ userIds, expireAt, ...rest }: MemberFormValues) => {
      const setting = { ...rest, expireAt: expireAt?.endOf('day').toISOString() ?? null }
      return member
        ? updateProjectMember(projectId, member.userId, setting)
        : addProjectMembers(projectId, { ...setting, userIds })
    },
    successMessage: isEdit ? '成员已更新' : '成员已添加',
    invalidateKeys: [PROJECTS_QUERY_KEY],
    onSuccess: onClose,
  })

  return (
    <FormDrawer<MemberFormValues>
      open={open}
      form={form}
      width={isEdit ? 560 : 680}
      title={isEdit ? `编辑成员 · ${member?.name}` : '添加成员'}
      onClose={onClose}
      onSubmit={(values) => mutation.mutate(values)}
      submitting={mutation.isPending}
      submitText={isEdit ? '保存' : `确认添加（${selectedIds.length} 人）`}
      initialValues={
        member
          ? {
              ...member,
              userIds: [member.userId],
              expireAt: member.expireAt ? dayjs(member.expireAt) : null,
            }
          : ADD_DEFAULTS
      }
      footer={
        <Alert
          type="info"
          showIcon
          title="成员的数据范围与用户全局角色叠加生效，取两者中较窄的范围；保存后立即生效并留痕。"
        />
      }
    >
      {!isEdit && (
        <Form.Item
          name="userIds"
          label="选择用户"
          required
          rules={[zodRule(shape.userIds)]}
          className="sm:col-span-2"
        >
          <UserPicker users={candidates} loading={usersLoading} />
        </Form.Item>
      )}
      <Form.Item name="role" label="项目内角色" required rules={[zodRule(shape.role)]}>
        <Select options={ProjectMemberRole.options} />
      </Form.Item>
      <Form.Item name="dataScope" label="数据范围" required rules={[zodRule(shape.dataScope)]}>
        <Select options={DataScope.options} />
      </Form.Item>
      <Form.Item name="expireAt" label="有效期至">
        <DatePicker
          className="w-full"
          placeholder="留空为长期有效"
          disabledDate={(date) => date.isBefore(dayjs(), 'day')}
        />
      </Form.Item>
      <Form.Item name="reminder" label="到期前提醒">
        <Select options={ExpiryReminder.options} />
      </Form.Item>
      <Form.Item
        name="remark"
        label="备注"
        rules={[zodRule(shape.remark)]}
        className="sm:col-span-2"
      >
        <Input placeholder="便于审计追溯" />
      </Form.Item>
    </FormDrawer>
  )
}
