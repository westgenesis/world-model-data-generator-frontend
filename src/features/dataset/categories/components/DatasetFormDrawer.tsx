import { Form, Input, Radio } from 'antd'
import type { Dataset } from '@/api/datasets'
import {
  DATASETS_QUERY_KEY,
  createDataset,
  datasetCreateSchema,
  toDatasetCreateInput,
  updateDataset,
} from '@/api/datasets'
import { FormDrawer } from '@/components/FormDrawer'
import { DatasetType } from '@/constants/enums'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { zodRule } from '@/lib/form'
import { useAppStore } from '@/stores/app-store'

interface DatasetFormDrawerProps {
  open: boolean
  /** 编辑的数据集；为空时为新增 */
  dataset?: Dataset
  onClose: () => void
}

/** 新增与编辑共用的表单值 */
interface DatasetFormValues {
  type?: DatasetType
  name: string
  description: string
}

/**
 * 新增 / 编辑数据集抽屉
 * @param props - 打开状态、编辑对象与关闭回调
 */
export const DatasetFormDrawer = ({ open, dataset, onClose }: DatasetFormDrawerProps) => {
  const isEdit = Boolean(dataset)
  const shape = datasetCreateSchema.shape
  const currentProjectId = useAppStore((s) => s.currentProjectId)
  /** 当前项目对应的数字 ID；未选择项目时为 undefined */
  const projectId = Number(currentProjectId) || undefined

  const mutation = useActionMutation({
    mutationFn: (values: DatasetFormValues) =>
      dataset
        ? updateDataset(dataset.id, {
            name: values.name,
            description: values.description.trim() || null,
          })
        : createDataset(
            toDatasetCreateInput({
              project_id: projectId!,
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
            }
          : { type: 'seed', name: '', description: '' }
      }
      submitText={isEdit ? '保存' : '创建'}
    >
      {!isEdit && (
        <Form.Item name="type" label="类型" required rules={[zodRule(shape.type)]}>
          <Radio.Group options={DatasetType.options} />
        </Form.Item>
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
