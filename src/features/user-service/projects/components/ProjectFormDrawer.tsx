import { useQuery } from '@tanstack/react-query'
import { Checkbox, Form, Input, InputNumber, Radio, Select } from 'antd'
import type { ProjectDetail, ProjectFormInput } from '@/api/projects'
import { createProject, PROJECTS_QUERY_KEY, projectFormSchema, updateProject } from '@/api/projects'
import { userOptionsQueryOptions } from '@/api/users'
import { FormDrawer } from '@/components/FormDrawer'
import { Department, ProjectVisibility } from '@/constants/enums'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { zodRule } from '@/lib/form'

interface ProjectFormDrawerProps {
  open: boolean
  /** 编辑的项目；为空时为新建 */
  project?: ProjectDetail
  onClose: () => void
}

/** 新建项目的表单默认值 */
const CREATE_DEFAULTS: Partial<ProjectFormInput> = {
  departments: [],
  description: '',
  visibility: 'members',
  storageQuotaTb: 30,
  computeQuotaHours: 2000,
  isDefault: false,
}

/**
 * 新建 / 编辑项目抽屉
 * @param props - 打开状态、编辑对象与关闭回调
 */
export const ProjectFormDrawer = ({ open, project, onClose }: ProjectFormDrawerProps) => {
  const isEdit = Boolean(project)
  const shape = projectFormSchema.shape
  const { data: users = [], isPending: usersLoading } = useQuery({
    ...userOptionsQueryOptions,
    enabled: open,
  })

  const mutation = useActionMutation({
    mutationFn: (values: ProjectFormInput) =>
      project ? updateProject(project.id, values) : createProject(values),
    successMessage: isEdit ? '项目已更新' : '项目已创建',
    invalidateKeys: [PROJECTS_QUERY_KEY],
    onSuccess: onClose,
  })

  return (
    <FormDrawer<ProjectFormInput>
      open={open}
      title={isEdit ? `编辑项目 · ${project?.name}` : '新建项目'}
      onClose={onClose}
      onSubmit={(values) => mutation.mutate(projectFormSchema.parse(values))}
      submitting={mutation.isPending}
      initialValues={
        project ? { ...project, ownerId: project.ownerId ?? undefined } : CREATE_DEFAULTS
      }
    >
      <Form.Item name="name" label="项目名称" required rules={[zodRule(shape.name)]}>
        <Input placeholder="例如：雨天场景数据生产" />
      </Form.Item>
      <Form.Item name="code" label="项目标识" required rules={isEdit ? [] : [zodRule(shape.code)]}>
        <Input placeholder="例如：PRJ-0012" disabled={isEdit} />
      </Form.Item>
      <Form.Item name="ownerId" label="负责人" required rules={[zodRule(shape.ownerId)]}>
        <Select
          placeholder="请选择"
          showSearch={{ optionFilterProp: 'label' }}
          loading={usersLoading}
          options={users.map((u) => ({ value: u.id, label: `${u.name}（${u.account}）` }))}
        />
      </Form.Item>
      <Form.Item name="departments" label="参与部门">
        <Select mode="multiple" placeholder="请选择" options={Department.options} />
      </Form.Item>
      <Form.Item
        name="description"
        label="项目描述"
        rules={[zodRule(shape.description)]}
        className="sm:col-span-2"
      >
        <Input.TextArea rows={2} placeholder="说明项目目标与数据用途" />
      </Form.Item>
      <Form.Item name="visibility" label="可见范围" className="sm:col-span-2">
        <Radio.Group options={ProjectVisibility.options} />
      </Form.Item>
      <Form.Item
        name="storageQuotaTb"
        label="存储参考值"
        required
        rules={[zodRule(shape.storageQuotaTb)]}
        extra="仅用于用量提醒，不限制使用"
      >
        <InputNumber className="w-full" min={0} suffix="TB" />
      </Form.Item>
      <Form.Item
        name="computeQuotaHours"
        label="算力参考值"
        required
        rules={[zodRule(shape.computeQuotaHours)]}
        extra="仅用于用量提醒，不限制使用"
      >
        <InputNumber className="w-full" min={0} suffix="卡时" />
      </Form.Item>
      <Form.Item
        name="isDefault"
        label="设为默认项目"
        valuePropName="checked"
        className="sm:col-span-2"
      >
        <Checkbox>未指定归属的数据自动归入本项目</Checkbox>
      </Form.Item>
    </FormDrawer>
  )
}
