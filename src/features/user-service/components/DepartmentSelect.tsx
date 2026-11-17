import { useQuery } from '@tanstack/react-query'
import type { SelectProps } from 'antd'
import { Select } from 'antd'
import { useMemo } from 'react'
import { departmentListQueryOptions } from '@/api/departments'

/** 单选为部门 ID，多选为部门 ID 数组 */
export type DepartmentSelectValue = number | number[]

export interface DepartmentSelectProps extends Omit<
  SelectProps<DepartmentSelectValue>,
  'options' | 'loading'
> {
  /** 只列出启用部门；已选中的停用部门仍会保留展示（默认 true） */
  activeOnly?: boolean
  /** 是否发起部门列表请求，抽屉内可传 open 延迟加载（默认 true） */
  enabled?: boolean
}

/**
 * 部门选择器：从部门接口加载选项，可直接作为 Form.Item 的受控组件使用
 * @param props - 选中值、是否仅限启用部门及其他 Select 配置
 */
export const DepartmentSelect = ({
  activeOnly = true,
  enabled = true,
  value,
  placeholder = '请选择部门',
  ...rest
}: DepartmentSelectProps) => {
  const { data = [], isPending } = useQuery({
    ...departmentListQueryOptions,
    enabled,
  })

  const selectedIds = useMemo(() => {
    if (value === undefined) return new Set<number>()
    return new Set(Array.isArray(value) ? value : [value])
  }, [value])

  const options = useMemo(
    () =>
      data
        .filter(
          (department) =>
            !activeOnly || department.is_active || selectedIds.has(department.department_id),
        )
        .map((department) => ({
          value: department.department_id,
          label: department.is_active ? department.name : `${department.name}（已停用）`,
          disabled: activeOnly && !department.is_active,
        })),
    [data, activeOnly, selectedIds],
  )

  return (
    <Select<DepartmentSelectValue>
      {...rest}
      value={value}
      placeholder={placeholder}
      loading={isPending}
      options={options}
    />
  )
}
