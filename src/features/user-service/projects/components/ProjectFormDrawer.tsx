import { useQuery } from '@tanstack/react-query'
import { Checkbox, Form, Input, InputNumber, Radio, Select } from 'antd'
import type { Project, ProjectFormValues } from '@/api/projects'
import {
  createProject,
  projectFormSchema,
  PROJECTS_QUERY_KEY,
  toProjectCreateInput,
  updateProject,
} from '@/api/projects'
import { userOptionsQueryOptions } from '@/api/users'
import { FormDrawer } from '@/components/FormDrawer'
import { ProjectVisibility } from '@/constants/enums'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { zodRule } from '@/lib/form'

interface ProjectFormDrawerProps {
  open: boolean
  /** 编辑的项目；为空时为新建 */
  project?: Project
  onClose: () => void
}

/** 新建项目的表单默认值 */
const CREATE_DEFAULTS: Partial<ProjectFormValues> = {
  description: '',
  visibility: 'member',
  storage_ref_tb: null,
  gpu_ref_hours: null,
  is_default: false,
}

/**
 * 新建 / 编辑项目抽屉（字段对应后端 ProjectCreate / ProjectUpdate）
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
    mutationFn: (values: ProjectFormValues) => {
      const input = toProjectCreateInput(values)
      return project ? updateProject(project.id, input) : createProject(input)
    },
    successMessage: isEdit ? '项目已更新' : '项目已创建',
    invalidateKeys: [PROJECTS_QUERY_KEY],
    onSuccess: onClose,
  })

  return (
    <FormDrawer<ProjectFormValues>
      open={open}
      title={isEdit ? `编辑项目 · ${project?.name}` : '新建项目'}
      onClose={onClose}
      onSubmit={(values) => mutation.mutate(projectFormSchema.parse(values))}
      submitting={mutation.isPending}
      initialValues={
        project
          ? {
              name: project.name,
              owner_id: project.owner_id,
              description: project.description ?? '',
              visibility: project.visibility,
              storage_ref_tb: project.storage_ref_tb,
              gpu_ref_hours: project.gpu_ref_hours,
              is_default: project.is_default,
            }
          : CREATE_DEFAULTS
      }
    >
      <Form.Item name="name" label="项目名称" required rules={[zodRule(shape.name)]}>
        <Input placeholder="例如：雨天场景数据生产" maxLength={128} showCount />
      </Form.Item>
      <Form.Item name="owner_id" label="负责人" required rules={[zodRule(shape.owner_id)]}>
        <Select
          placeholder="请选择"
          loading={usersLoading}
          showSearch={{ optionFilterProp: 'label' }}
          options={users.map((u) => ({ value: Number(u.id), label: `${u.name}（${u.account}）` }))}
        />
      </Form.Item>
      <Form.Item name="visibility" label="可见范围" required className="sm:col-span-2">
        <Radio.Group options={ProjectVisibility.options} />
      </Form.Item>
      <Form.Item
        name="description"
        label="项目描述"
        rules={[zodRule(shape.description)]}
        className="sm:col-span-2"
      >
        <Input.TextArea rows={2} placeholder="说明项目目标与数据用途" maxLength={512} showCount />
      </Form.Item>
      <Form.Item
        name="storage_ref_tb"
        label="存储参考值"
        rules={[zodRule(shape.storage_ref_tb)]}
        extra="仅用于用量提醒，不限制使用"
      >
        <InputNumber
          className="w-full"
          min={0}
          suffix="TB"
          placeholder="不设置（清空输入可恢复）"
        />
      </Form.Item>
      <Form.Item
        name="gpu_ref_hours"
        label="算力参考值"
        rules={[zodRule(shape.gpu_ref_hours)]}
        extra="仅用于用量提醒，不限制使用"
      >
        <InputNumber
          className="w-full"
          min={0}
          suffix="卡时"
          placeholder="不设置（清空输入可恢复）"
        />
      </Form.Item>
      <Form.Item
        name="is_default"
        label="设为默认项目"
        valuePropName="checked"
        className="sm:col-span-2"
        extra="设为默认项目后，未指定归属的数据自动归入本项目"
      >
        <Checkbox>设为默认项目</Checkbox>
      </Form.Item>
    </FormDrawer>
  )
}
