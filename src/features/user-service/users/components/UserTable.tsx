import type { TablePaginationConfig, TableProps } from 'antd'
import { Button, Table } from 'antd'
import type { User } from '@/api/users'
import { EnumTag } from '@/components/EnumTag'
import { Department, UserStatus } from '@/constants/enums'
import { formatDateTime } from '@/lib/format'

interface UserTableProps {
  data: User[]
  loading: boolean
  pagination: TablePaginationConfig
  /** 编辑用户 */
  onEdit: (user: User) => void
  /** 授予附加权限 */
  onGrant: (user: User) => void
  /** 切换启用 / 停用 */
  onToggleStatus: (user: User) => void
}

/**
 * 用户列表表格
 * @param props - 数据、分页与行操作回调
 */
export const UserTable = ({
  data,
  loading,
  pagination,
  onEdit,
  onGrant,
  onToggleStatus,
}: UserTableProps) => {
  const columns: TableProps<User>['columns'] = [
    { title: '用户', dataIndex: 'name', width: 140 },
    {
      title: '账号',
      dataIndex: 'account',
      render: (account: string) => (
        <span className="font-mono text-[13px] text-fg-2">{account}</span>
      ),
    },
    {
      title: '所属部门',
      dataIndex: 'department',
      render: (value: User['department']) => Department.getLabel(value),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: User['status']) => <EnumTag enumDef={UserStatus} value={value} />,
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginAt',
      width: 150,
      render: (value: string | null) => (
        <span className="text-fg-2 tabular-nums">{formatDateTime(value, 'MM-DD HH:mm')}</span>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      fixed: 'end',
      render: (_, user) => (
        <div className="-ms-2 flex">
          <Button type="link" size="small" onClick={() => onEdit(user)}>
            编辑
          </Button>
          <Button type="link" size="small" onClick={() => onGrant(user)}>
            授权
          </Button>
          <Button
            type="link"
            size="small"
            danger={user.status === 'enabled'}
            onClick={() => onToggleStatus(user)}
          >
            {user.status === 'enabled' ? '停用' : '启用'}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-card shadow-card">
      <Table<User>
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ ...pagination, className: 'px-4' }}
        scroll={{ x: 800 }}
      />
    </div>
  )
}
