import { useQuery } from '@tanstack/react-query'
import { Form, Input, Radio, Select } from 'antd'
import { useMemo } from 'react'
import type { Dataset } from '@/api/datasets'
import {
  DATASETS_QUERY_KEY,
  createDataset,
  datasetCreateSchema,
  toDatasetCreateInput,
  updateDataset,
} from '@/api/datasets'
import { projectsQueryOptions } from '@/api/projects'
import { FormDrawer } from '@/components/FormDrawer'
import { DatasetType, EnabledState } from '@/constants/enums'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { zodRule } from '@/lib/form'
import { useAppStore } from '@/stores/app-store'

interface DatasetFormDrawerProps {
  open: boolean
  /** 编辑的数据集；为空时为新增 */
  dataset?: Dataset
  onClose: () => void
}

/** 新增与编辑共用的表单值：新增含 project_id / type，编辑含 state */
interface DatasetFormValues {
  project_id?: number
  type?: DatasetType
  name: string
  description: string
  state?: EnabledState
}

/**
 * 新增 / 编辑数据集抽屉
 * @param props - 打开状态、编辑对象与关闭回调
 */
export const DatasetFormDrawer = ({ open, dataset, onClose }: DatasetFormDrawerProps) => {
  const isEdit = Boolean(dataset)
  const shape = datasetCreateSchema.shape
  const { data: projects = [] } = useQuery(projectsQueryOptions)
  const currentProjectId = useAppStore((s) => s.currentProjectId)

  /** 默认所属项目：优先当前全局项目，未匹配时取第一个项目 */
  const defaultProjectId = useMemo(() => {
    if (projects.length === 0) return undefined
    const current = projects.find((project) => String(project.id) === currentProjectId)
    return current ? current.id : projects[0].id
  }, [projects, currentProjectId])

  const mutation = useActionMutation({
    mutationFn: (values: DatasetFormValues) =>
      dataset
        ? updateDataset(dataset.id, {
            name: values.name,
            description: values.description.trim() || null,
            state: values.state,
          })
        : createDataset(
            toDatasetCreateInput({
              project_id: values.project_id!,
              type: values.type!,
              name: values.name,
              description: values.description,
            }),
          ),
    successMessage: isEdit ? '数据集已更新' : '数据集已创建',
    invalidateKeys: [DATASETS_QUERY_KEY],
    onSuccess: onClose,
  })

  return (
    <FormDrawer<DatasetFormValues>
      open={open}
      title={isEdit ? `编辑数据集 · ${dataset?.name}` : '新建数据集'}
      onClose={onClose}
      onSubmit={(values) => mutation.mutate(values)}
      submitting={mutation.isPending}
      initialValues={
        dataset
          ? {
              name: dataset.name,
              description: dataset.description ?? '',
              state: dataset.state,
            }
          : { project_id: defaultProjectId, type: 'seed', name: '', description: '' }
      }
      submitText={isEdit ? '保存' : '创建'}
    >
      {isEdit ? (
        <Form.Item
          name="state"
          label="状态"
          className="sm:col-span-2"
          extra="停用后标签不再命中，存量保留。"
        >
          <Radio.Group options={EnabledState.options} />
        </Form.Item>
      ) : (
        <>
          <Form.Item
            name="project_id"
            label="所属项目"
            required
            rules={[zodRule(shape.project_id)]}
            extra="默认取顶栏当前项目。"
          >
            <Select
              placeholder="选择所属项目"
              options={projects.map((project) => ({ value: project.id, label: project.name }))}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item name="type" label="类型" required rules={[zodRule(shape.type)]}>
            <Radio.Group options={DatasetType.options} />
          </Form.Item>
        </>
      )}

      <Form.Item
        name="name"
        label="名称"
        required
        rules={[zodRule(shape.name)]}
        className="sm:col-span-2"
      >
        <Input placeholder="如：夜间城市道路数据" maxLength={64} showCount />
      </Form.Item>

      <Form.Item
        name="description"
        label="描述"
        rules={[zodRule(shape.description)]}
        className="sm:col-span-2"
      >
        <Input.TextArea placeholder="简述数据集的用途与内容" maxLength={512} showCount rows={3} />
      </Form.Item>
    </FormDrawer>
  )
}
