import { useQuery } from '@tanstack/react-query'
import type { SelectProps } from 'antd'
import { Select } from 'antd'
import { useMemo, useState } from 'react'
import { userSearchQueryOptions } from '@/api/users'
import { useDebouncedValue } from '@/hooks/use-list-params'

export interface UserSelectProps extends Omit<
  SelectProps<number>,
  'options' | 'loading' | 'onSearch'
> {
  /** 是否发起用户搜索请求，弹窗内可传 open 延迟加载（默认 true） */
  enabled?: boolean
}

/** 已选用户选项，用于搜索词变化后仍能展示已选用户的名称 */
interface SelectedOption {
  value: number
  label: string
}

/**
 * 用户选择器：按账号 / 姓名远程搜索启用中的用户，可直接作为 Form.Item 的受控组件使用
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
    ...userSearchQueryOptions(debouncedKeyword),
    enabled,
  })
  const [selected, setSelected] = useState<SelectedOption | null>(null)

  const options = useMemo(() => {
    const list: SelectedOption[] = (data?.items ?? []).map((user) => ({
      value: user.user_id,
      label: `${user.full_name}（${user.username}）`,
    }))
    // 搜索词变化后结果里可能没有已选用户，补充一条选项以继续展示名称
    const needFallback =
      selected !== null &&
      value === selected.value &&
      !list.some((option) => option.value === selected.value)
    return needFallback ? [selected, ...list] : list
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
