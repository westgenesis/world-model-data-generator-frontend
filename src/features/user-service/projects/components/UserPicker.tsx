import type { TableProps } from 'antd'
import { Input, Table } from 'antd'
import { Search } from 'lucide-react'
import { useState } from 'react'
import type { UserBrief } from '@/api/users'
import { EnumTag } from '@/components/EnumTag'
import { Department, UserRole } from '@/constants/enums'

interface UserPickerProps {
  /** 可选用户 */
  users: UserBrief[]
  /** 已选用户 ID（受控，供 Form.Item 注入） */
  value?: string[]
  /** 选择变化（供 Form.Item 注入） */
  onChange?: (value: string[]) => void
  loading?: boolean
}

/** 用户选择表格列 */
const COLUMNS: TableProps<UserBrief>['columns'] = [
  { title: '用户', dataIndex: 'name' },
  {
    title: '账号',
    dataIndex: 'account',
    render: (v: string) => <span className="font-mono text-[13px] text-fg-2">{v}</span>,
  },
  {
    title: '全局角色',
    dataIndex: 'role',
    render: (v: UserBrief['role']) => <EnumTag enumDef={UserRole} value={v} />,
  },
  {
    title: '所属部门',
    dataIndex: 'department',
    render: (v: UserBrief['department']) => Department.getLabel(v),
  },
]

/**
 * 多选用户表格：支持按姓名 / 账号搜索，可作为 Form.Item 的受控组件使用
 * @param props - 可选用户与选中值
 */
export const UserPicker = ({ users, value = [], onChange, loading }: UserPickerProps) => {
  const [keyword, setKeyword] = useState('')
  const kw = keyword.trim().toLowerCase()
  const filtered = kw
    ? users.filter((u) => u.name.toLowerCase().includes(kw) || u.account.toLowerCase().includes(kw))
    : users

  return (
    <div className="flex flex-col gap-2">
      <Input
        allowClear
        prefix={<Search size={14} className="text-fg-3" />}
        placeholder="按姓名 / 账号搜索"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
      />
      <Table<UserBrief>
        rowKey="id"
        size="small"
        columns={COLUMNS}
        dataSource={filtered}
        loading={loading}
        pagination={false}
        scroll={{ y: 240 }}
        rowSelection={{
          selectedRowKeys: value,
          preserveSelectedRowKeys: true,
          onChange: (keys) => onChange?.(keys as string[]),
        }}
      />
    </div>
  )
}
