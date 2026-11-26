import { Form, Input, Radio, Select } from 'antd'
import type { TagSet } from '@/api/datasets'
import {
  TAG_SETS_QUERY_KEY,
  createTagSet,
  normalizeConstraint,
  tagSetCreateSchema,
  toTagSetCreateInput,
  updateTagSet,
} from '@/api/datasets'
import { FormDrawer } from '@/components/FormDrawer'
import { TagSetType } from '@/constants/enums'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { zodRule } from '@/lib/form'

interface TagSetFormDrawerProps {
  open: boolean
  /** 新增时的所属数据集 ID */
  datasetId: number
  /** 编辑的标签集；为空时为新增 */
  tagSet?: TagSet
  onClose: () => void
}

/** 新增与编辑共用的表单值 */
type TagSetFormValues = {
  name: string
  type: TagSetType
  value_constraint: string[] | string
  tag_source: string
}

/**
 * 新增 / 编辑标签集抽屉
 * @param props - 打开状态、所属数据集、编辑对象与关闭回调
 */
export const TagSetFormDrawer = ({ open, datasetId, tagSet, onClose }: TagSetFormDrawerProps) => {
  const isEdit = Boolean(tagSet)
  const shape = tagSetCreateSchema.shape
  const [form] = Form.useForm<TagSetFormValues>()
  const watchType = Form.useWatch('type', form)
  const type = watchType ?? tagSet?.type ?? 'enum_type'

  const mutation = useActionMutation({
    mutationFn: (values: TagSetFormValues) => {
      const input = toTagSetCreateInput(values)
      return tagSet
        ? updateTagSet(tagSet.id, {
            name: input.name,
            type: input.type,
            value_constraint: input.value_constraint,
            tag_source: input.tag_source,
          })
        : createTagSet(datasetId, input)
    },
    successMessage: isEdit ? '标签集已更新' : '标签集已创建',
    invalidateKeys: [TAG_SETS_QUERY_KEY],
    onSuccess: onClose,
  })

  return (
    <FormDrawer<TagSetFormValues>
      open={open}
      title={isEdit ? `编辑标签集 · ${tagSet?.name}` : '新增标签集'}
      onClose={onClose}
      onSubmit={(values) => mutation.mutate(values)}
      submitting={mutation.isPending}
      form={form}
      initialValues={
        tagSet
          ? {
              name: tagSet.name,
              type: tagSet.type,
              value_constraint: normalizeConstraint(tagSet.type, tagSet.value_constraint),
              tag_source: tagSet.tag_source ?? '',
            }
          : { type: 'enum_type', value_constraint: [], tag_source: '' }
      }
      submitText={isEdit ? '保存' : '创建'}
    >
      <Form.Item
        name="name"
        label="名称"
        required
        rules={[zodRule(shape.name)]}
        className="sm:col-span-2"
      >
        <Input placeholder="如：天气、能见度、场景类别" maxLength={64} showCount />
      </Form.Item>

      <Form.Item name="type" label="类型" required rules={[zodRule(shape.type)]}>
        <Radio.Group
          options={TagSetType.options}
          onChange={(event) => {
            if (event.target.value !== type) form.setFieldValue('value_constraint', undefined)
          }}
        />
      </Form.Item>

      {type === 'enum_type' ? (
        <Form.Item
          name="value_constraint"
          label="预设取值"
          required
          rules={[zodRule(shape.value_constraint)]}
          className="sm:col-span-2"
          extra="回车添加多个取值。"
        >
          <Select mode="tags" placeholder="如：晴、阴、雨、雪" open={false} />
        </Form.Item>
      ) : (
        <Form.Item
          name="value_constraint"
          label="取值约束"
          required
          rules={[zodRule(shape.value_constraint)]}
          className="sm:col-span-2"
          extra="取值范围描述，如 0-100。"
        >
          <Input placeholder="如：0-100、>50" />
        </Form.Item>
      )}

      <Form.Item
        name="tag_source"
        label="打标来源"
        rules={[zodRule(shape.tag_source)]}
        className="sm:col-span-2"
        extra="标签产出方式，可留空。"
      >
        <Input placeholder="如：自动规则、人工标注" maxLength={255} />
      </Form.Item>
    </FormDrawer>
  )
}
