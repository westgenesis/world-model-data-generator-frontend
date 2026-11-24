import { useQuery } from '@tanstack/react-query'
import type { FormRule } from 'antd'
import { Button, Form, InputNumber, Result, Skeleton } from 'antd'
import type { LogStoragePolicy } from '@/api/logs'
import { LOGS_QUERY_KEY, logStoragePolicyQueryOptions, updateStoragePolicy } from '@/api/logs'
import { SectionCard } from '@/components/SectionCard'
import { useActionMutation } from '@/hooks/use-action-mutation'

/** 存储天数的取值范围（与后端校验一致） */
const DAYS_RANGE = { min: 1, max: 3650 }

/** 存储策略字段 */
interface PolicyField {
  /** 表单项名称，与接口字段一致 */
  name: keyof LogStoragePolicy
  /** 表单项名称 */
  label: string
  /** 表单项下方的说明 */
  description: string
}

/** 存储策略字段（顺序即表单展示顺序） */
const POLICY_FIELDS: readonly PolicyField[] = [
  { name: 'hot_days', label: '热存储天数', description: '近期日志，支持秒级检索' },
  { name: 'warm_days', label: '温存储天数', description: '查询较少，仍需较快检索' },
  { name: 'cold_days', label: '冷存储天数', description: '归档保留，超出后按策略清理' },
]

/**
 * 生成单个字段的校验规则
 * @param field - 字段定义
 * @returns antd 表单校验规则
 */
const fieldRules = (field: PolicyField): FormRule[] => [
  { required: true, message: `请输入${field.label}` },
  {
    type: 'number',
    min: DAYS_RANGE.min,
    max: DAYS_RANGE.max,
    message: `${field.label}需在 ${DAYS_RANGE.min} ~ ${DAYS_RANGE.max} 之间`,
  },
]

/** 存储策略面板：查询并更新日志冷热存储天数 */
export const StoragePolicyPanel = () => {
  const [form] = Form.useForm<LogStoragePolicy>()
  const { data, isPending, isError, refetch } = useQuery(logStoragePolicyQueryOptions)

  const save = useActionMutation<LogStoragePolicy, LogStoragePolicy>({
    mutationFn: updateStoragePolicy,
    successMessage: '存储策略已更新',
    invalidateKeys: [LOGS_QUERY_KEY],
    onSuccess: (policy) => form.setFieldsValue(policy),
  })

  if (isPending) {
    return (
      <SectionCard title="存储策略">
        <Skeleton active paragraph={{ rows: 4 }} />
      </SectionCard>
    )
  }

  if (isError && !data) {
    return (
      <SectionCard title="存储策略">
        <Result
          status="error"
          title="存储策略加载失败"
          subTitle="请检查网络后重试"
          extra={
            <Button type="primary" onClick={() => void refetch()}>
              重试
            </Button>
          }
        />
      </SectionCard>
    )
  }

  return (
    <SectionCard title="存储策略" sub="仅保存配置，不迁移或清理日志">
      <Form<LogStoragePolicy>
        form={form}
        layout="vertical"
        initialValues={data}
        onFinish={(values) => save.mutate(values)}
      >
        {POLICY_FIELDS.map((field) => (
          <Form.Item
            key={field.name}
            name={field.name}
            label={field.label}
            required
            rules={fieldRules(field)}
            extra={field.description}
          >
            <InputNumber
              className="w-full"
              min={DAYS_RANGE.min}
              max={DAYS_RANGE.max}
              precision={0}
              suffix="天"
            />
          </Form.Item>
        ))}
        <Button type="primary" htmlType="submit" block loading={save.isPending}>
          保存
        </Button>
      </Form>
    </SectionCard>
  )
}
