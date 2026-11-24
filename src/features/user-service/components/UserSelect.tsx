import { useQuery } from '@tanstack/react-query'
import type { SelectProps } from 'antd'
import { Select } from 'antd'
import { useMemo, useState } from 'react'
import type { UserOption } from '@/api/users'
import { USER_OPTION_LIMIT, userOptionQueryOptions } from '@/api/users'
import { useDebouncedValue } from '@/hooks/use-list-params'

export interface UserSelectProps extends Omit<
  SelectProps<number>,
  'options' | 'loading' | 'onSearch'
> {
  /** 是否发起用户搜索请求，弹窗内可传 open 延迟加载（默认 true） */
  enabled?: boolean
}

/** 下拉候选项，超出条数上限时追加一条不可选提示 */
interface UserSelectOption {
  value: number | string
  label: string
  disabled?: boolean
}

/** 超出 limit 后追加的提示项，禁用后不会被选中 */
const MORE_HINT_VALUE = '__user_option_more__'

/** 已选用户选项，用于搜索词变化后仍能展示已选用户的名称 */
interface SelectedOption {
  value: number
  label: string
}

/**
 * 拼接候选文案：姓名（账号 · 部门），无部门时省略部门
 * @param user - 用户候选
 * @returns 展示文案
 */
const formatOptionLabel = (user: UserOption): string =>
  user.department_name
    ? `${user.full_name}（${user.username} · ${user.department_name}）`
    : `${user.full_name}（${user.username}）`

/**
 * 用户选择器：按账号 / 姓名远程搜索用户候选，可直接作为 Form.Item 的受控组件使用
 * @param props - 选中值、是否加载选项及其他 Select 配置
 */
export const UserSelect = ({
  enabled = true,
  value,
  onChange,
  placeholder = '请选择用户',
  ...rest
}: UserSelectProps) => {
  const [keyword, setKeyword] = useState('')
  const debouncedKeyword = useDebouncedValue(keyword, 300)
  const { data, isFetching } = useQuery({
    ...userOptionQueryOptions(debouncedKeyword),
    enabled,
  })
  const [selected, setSelected] = useState<SelectedOption | null>(null)

  const options = useMemo(() => {
    const list: UserSelectOption[] = (data?.items ?? []).map((user) => ({
      value: user.user_id,
      label: formatOptionLabel(user),
    }))
    // 搜索词变化后结果里可能没有已选用户，补充一条选项以继续展示名称
    const needFallback =
      selected !== null &&
      value === selected.value &&
      !list.some((option) => option.value === selected.value)
    const merged: UserSelectOption[] = needFallback ? [selected, ...list] : list
    if (!data?.has_more) return merged
    return [
      ...merged,
      {
        value: MORE_HINT_VALUE,
        label: `仅展示前 ${USER_OPTION_LIMIT} 条，输入关键词查看更多`,
        disabled: true,
      },
    ]
  }, [data, selected, value])

  return (
    <Select<number>
      {...rest}
      showSearch
      filterOption={false}
      value={value}
      placeholder={placeholder}
      loading={isFetching}
      options={options}
      onSearch={setKeyword}
      onChange={(nextValue, option) => {
        const next = nextValue as number | undefined
        const optionLabel = String(
          Array.isArray(option) ? (option[0]?.label ?? '') : (option?.label ?? ''),
        )
        setSelected(next === undefined ? null : { value: next, label: optionLabel })
        onChange?.(nextValue, option)
      }}
    />
  )
}
