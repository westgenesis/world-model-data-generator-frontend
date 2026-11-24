import type { MenuProps, TablePaginationConfig, TableProps } from 'antd'
import { Button, Dropdown, Table, Tag, Tooltip } from 'antd'
import type { User } from '@/api/users'
import { SUPER_ADMIN_ROLE_CODE } from '@/api/users'
import { EnumTag } from '@/components/EnumTag'
import { UserStatus } from '@/constants/enums'
import { PERMISSION } from '@/constants/permissions'
import { usePermissions } from '@/hooks/use-permissions'
import { EMPTY_TEXT, formatDateTime } from '@/lib/format'

interface UserTableProps {
  data: User[]
  loading: boolean
  pagination: TablePaginationConfig
  /** 编辑用户 */
  onEdit: (user: User) => void
  /** 授予临时权限 */
  onGrant: (user: User) => void
  /** 重置密码 */
  onResetPassword: (user: User) => void
  /** 解除登录限流 */
  onUnlock: (user: User) => void
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
  onResetPassword,
  onUnlock,
  onToggleStatus,
}: UserTableProps) => {
  const { has } = usePermissions()
  const canUpdate = has(PERMISSION.userUpdate)
  const canGrant = has(PERMISSION.userPermissionGrant)
  const canResetPassword = has(PERMISSION.userPasswordReset)
  const canUnlock = has(PERMISSION.userUnlock)
  const hasRowActions = canUpdate || canGrant || canResetPassword || canUnlock

  /**
   * 当前行是否可打开「更多」菜单
   * @param user - 用户
   * @returns 是否有可用的更多操作
   */
  const canOpenMore = (user: User) => canResetPassword || (canUnlock && user.login_throttled)

  /** 「更多」菜单：重置密码，登录被限流时追加解锁 */
  const moreMenu = (user: User): MenuProps => ({
    items: [
      ...(canResetPassword ? [{ key: 'reset-password', label: '重置密码' }] : []),
      ...(canUnlock && user.login_throttled ? [{ key: 'unlock', label: '解除登录限流' }] : []),
    ],
    onClick: ({ key }) => {
      if (key === 'reset-password') onResetPassword(user)
      if (key === 'unlock') onUnlock(user)
    },
  })

  const allColumns: NonNullable<TableProps<User>['columns']> = [
    {
      title: '用户',
      dataIndex: 'full_name',
      width: 120,
      render: (fullName: string, user) => (
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-fg">{fullName}</span>
          {user.login_throttled && (
            <Tag color="warning" variant="filled" className="me-0">
              登录限流
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: '账号',
      dataIndex: 'username',
      render: (username: string) => (
        <span className="font-mono text-[13px] text-fg-2">{username}</span>
      ),
    },
    {
      title: '所属部门',
      dataIndex: 'department',
      render: (department: User['department']) => department?.name ?? EMPTY_TEXT,
    },
    {
      title: '全局角色',
      dataIndex: 'role',
      render: (role: User['role']) =>
        role ? (
          <Tag variant="filled" className="me-0">
            {role.name}
          </Tag>
        ) : (
          <span className="text-fg-3">未分配</span>
        ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: User['status']) => <EnumTag enumDef={UserStatus} value={value} />,
    },
    {
      title: '最后登录',
      dataIndex: 'last_login_at',
      width: 130,
      render: (value: string | null) => (
        <span className="text-fg-2 tabular-nums">{formatDateTime(value, 'MM-DD HH:mm')}</span>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 230,
      fixed: 'end',
      render: (_, user) => {
        const locked = user.role?.code === SUPER_ADMIN_ROLE_CODE
        return (
          <Tooltip title={locked ? '超级管理员账号不允许操作' : undefined}>
            <div className="-ms-2 flex items-center">
              {canUpdate && (
                <Button type="link" size="small" disabled={locked} onClick={() => onEdit(user)}>
                  编辑
                </Button>
              )}
              {canGrant && (
                <Button type="link" size="small" disabled={locked} onClick={() => onGrant(user)}>
                  授权
                </Button>
              )}
              {canUpdate && (
                <Button
                  type="link"
                  size="small"
                  disabled={locked}
                  danger={user.status === 'active'}
                  onClick={() => onToggleStatus(user)}
                >
                  {user.status === 'active' ? '停用' : '启用'}
                </Button>
              )}
              {canOpenMore(user) && (
                <Dropdown menu={moreMenu(user)} trigger={['click']} disabled={locked}>
                  <Button type="link" size="small" disabled={locked}>
                    更多
                  </Button>
                </Dropdown>
              )}
            </div>
          </Tooltip>
        )
      },
    },
  ]

  const columns = allColumns.filter((column) => hasRowActions || column.key !== 'actions')

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-card shadow-card">
      <Table<User>
        rowKey="user_id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ ...pagination, className: 'px-4' }}
        scroll={{ x: 980 }}
      />
    </div>
  )
}
