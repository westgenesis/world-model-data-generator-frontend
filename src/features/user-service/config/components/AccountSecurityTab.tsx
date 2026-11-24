import { useQuery } from '@tanstack/react-query'
import type { FormRule } from 'antd'
import { Button, Form, InputNumber, Result, Skeleton } from 'antd'
import { useMemo } from 'react'
import type { SettingItem } from '@/api/settings'
import { SETTINGS_QUERY_KEY, settingsQueryOptions, updateSettings } from '@/api/settings'
import { SectionCard } from '@/components/SectionCard'
import { PERMISSION } from '@/constants/permissions'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { usePermissions } from '@/hooks/use-permissions'

/** 账号安全配置项的展示与校验信息 */
interface SecurityField {
  /** 后端配置标识 */
  key: string
  /** 表单项名称 */
  label: string
  /** 允许的最小值 */
  min: number
  /** 允许的最大值 */
  max: number
  /** 后端未返回该配置时的默认值 */
  defaultValue: number
  /** 表单项下方的说明 */
  description?: string
}

/** 账号安全配置项（顺序即表单展示顺序） */
const SECURITY_FIELDS: readonly SecurityField[] = [
  {
    key: 'security.password.min_length',
    label: '密码最小长度',
    min: 6,
    max: 64,
    defaultValue: 10,
    description: '新建密码或修改密码时要求的最少字符数',
  },
  {
    key: 'security.password.expire_days',
    label: '密码有效期（天）',
    min: 1,
    max: 3650,
    defaultValue: 90,
    description: '超过有效期后需重新设置密码',
  },
  {
    key: 'security.login.max_failures',
    label: '登录失败次数上限',
    min: 1,
    max: 20,
    defaultValue: 5,
    description: '连续登录失败达到该次数后锁定账号',
  },
  {
    key: 'security.login.lock_minutes',
    label: '登录锁定分钟数',
    min: 1,
    max: 1440,
    defaultValue: 30,
    description: '账号被锁定后自动解锁的等待时长',
  },
  {
    key: 'security.session.timeout_minutes',
    label: '登录会话超时（分钟）',
    min: 1,
    max: 1440,
    defaultValue: 30,
    description: '无操作超过该时长后需要重新登录',
  },
  {
    key: 'security.session.refresh_expire_days',
    label: '登录会话续期有效期（天）',
    min: 1,
    max: 365,
    defaultValue: 7,
    description: '刷新令牌的有效期，超过后需重新登录',
  },
]

/** 配置标识 */
type SecurityKey = (typeof SECURITY_FIELDS)[number]['key']

/** 账号安全表单值 */
type SecurityFormValues = Record<SecurityKey, number>

/**
 * 把后端配置值解析为表单数字，缺失或非法时回退到默认值
 * @param field - 配置项定义
 * @param raw - 后端返回的字符串值
 * @returns 表单使用的数字值
 */
const parseFieldValue = (field: SecurityField, raw?: string): number => {
  if (!raw?.trim()) return field.defaultValue
  const value = Number(raw)
  return Number.isFinite(value) ? value : field.defaultValue
}

/**
 * 把后端配置项转换为表单初始值
 * @param items - 后端返回的配置项列表
 * @returns 以配置标识为键的表单值
 */
const buildFormValues = (items: SettingItem[]): SecurityFormValues => {
  const stored = new Map(items.map((item) => [item.key, item.value]))
  return Object.fromEntries(
    SECURITY_FIELDS.map((field) => [field.key, parseFieldValue(field, stored.get(field.key))]),
  )
}

/**
 * 生成单个配置项的校验规则
 * @param field - 配置项定义
 * @returns antd 表单校验规则
 */
const fieldRules = (field: SecurityField): FormRule[] => [
  { required: true, message: `请输入${field.label}` },
  {
    type: 'number',
    min: field.min,
    max: field.max,
    message: `${field.label}需在 ${field.min} ~ ${field.max} 之间`,
  },
]

/** 统一配置管理 · 账号安全：密码、登录与会话策略 */
export const AccountSecurityTab = () => {
  const [form] = Form.useForm<SecurityFormValues>()
  const { data, isPending, isError, refetch } = useQuery(settingsQueryOptions)
  const { has } = usePermissions()
  const canUpdate = has(PERMISSION.settingUpdate)

  const initialValues = useMemo(() => buildFormValues(data ?? []), [data])

  const save = useActionMutation<SecurityFormValues, SettingItem[]>({
    mutationFn: (values) =>
      updateSettings(
        SECURITY_FIELDS.map((field) => ({
          key: field.key,
          value: String(values[field.key]),
        })),
      ),
    successMessage: '账号安全策略已保存',
    invalidateKeys: [SETTINGS_QUERY_KEY],
    onSuccess: (items) => form.setFieldsValue(buildFormValues(items)),
  })

  if (isPending) {
    return (
      <SectionCard title="账号安全策略">
        <Skeleton active paragraph={{ rows: 6 }} />
      </SectionCard>
    )
  }

  if (isError && !data) {
    return (
      <SectionCard title="账号安全策略">
        <Result
          status="error"
          title="配置加载失败"
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
    <SectionCard title="账号安全策略" sub="修改后立即对本系统全部账号生效">
      <Form<SecurityFormValues>
        form={form}
        layout="vertical"
        disabled={!canUpdate}
        initialValues={initialValues}
        onFinish={(values) => save.mutate(values)}
      >
        <div className="grid gap-x-6 md:grid-cols-2">
          {SECURITY_FIELDS.map((field) => (
            <Form.Item
              key={field.key}
              name={field.key}
              label={field.label}
              required
              rules={fieldRules(field)}
              extra={field.description}
            >
              <InputNumber
                className="w-full"
                min={field.min}
                max={field.max}
                precision={0}
                placeholder={`${field.min} ~ ${field.max}`}
              />
            </Form.Item>
          ))}
        </div>
        {canUpdate && (
          <div className="flex justify-end">
            <Button type="primary" htmlType="submit" loading={save.isPending}>
              保存
            </Button>
          </div>
        )}
      </Form>
    </SectionCard>
  )
}
