import type { SelectProps } from 'antd'
import { Select } from 'antd'
import { useMemo } from 'react'
import { useRoleList } from '../hooks/use-role-list'

/** 单选为角色 ID，多选为角色 ID 数组 */
export type RoleSelectValue = number | number[]

export interface RoleSelectProps extends Omit<SelectProps<RoleSelectValue>, 'options' | 'loading'> {
  /** 是否发起角色列表请求，抽屉内可传 open 延迟加载（默认 true） */
  enabled?: boolean
}

/**
 * 角色选择器：从角色接口加载选项，可直接作为 Form.Item 的受控组件使用
 * @param props - 选中值及其他 Select 配置
 */
export const RoleSelect = ({
  enabled = true,
  value,
  placeholder = '请选择角色',
  ...rest
}: RoleSelectProps) => {
  const { data = [], isPending } = useRoleList(enabled)

  const options = useMemo(
    () => data.map((role) => ({ value: role.role_id, label: role.name })),
    [data],
  )

  return (
    <Select<RoleSelectValue>
      {...rest}
      value={value}
      placeholder={placeholder}
      loading={isPending}
      options={options}
    />
  )
}
