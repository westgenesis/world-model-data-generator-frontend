import type { TableProps } from 'antd'
import { Alert, Button, Checkbox, Skeleton, Table, Tooltip } from 'antd'
import type { Permission } from '@/api/permissions'
import type { Role } from '@/api/roles'
import { PERMISSION } from '@/constants/permissions'
import type { PermissionTreeRow } from '@/hooks/use-permission-tree'
import { usePermissions } from '@/hooks/use-permissions'

interface RolePermissionTableProps {
  /** 权限树展开后的表格行 */
  rows: PermissionTreeRow[]
  /** 角色列表，每个角色一列 */
  roles: Role[]
  /** 角色 ID -> 已持有的权限 code */
  codesByRole: ReadonlyMap<number, ReadonlySet<string>>
  /** 角色详情加载中的角色 */
  loadingRoleIds: ReadonlySet<number>
  /** 角色详情加载失败的角色 */
  failedRoleIds: ReadonlySet<number>
  /** 正在保存权限的角色 */
  savingRoleIds: ReadonlySet<number>
  /** 权限列表或角色列表是否在重新加载 */
  loading: boolean
  /** 切换角色的某项权限 */
  onToggle: (roleId: number, permission: Permission, checked: boolean) => void
  /** 重试加载失败的角色详情 */
  onRetryFailed: () => void
}

/** 列宽：前三列固定 590，每个角色列 110 */
const BASE_WIDTH = 590
const ROLE_WIDTH = 110

/**
 * 角色权限矩阵表格：模块 / 子模块 / 权限项 × 角色勾选框
 * @param props - 权限树、角色、勾选状态与回调
 */
export const RolePermissionTable = ({
  rows,
  roles,
  codesByRole,
  loadingRoleIds,
  failedRoleIds,
  savingRoleIds,
  loading,
  onToggle,
  onRetryFailed,
}: RolePermissionTableProps) => {
  const { has } = usePermissions()
  const canEdit = has(PERMISSION.rolePermissionUpdate)
  const columns: NonNullable<TableProps<PermissionTreeRow>['columns']> = [
    {
      title: '模块',
      dataIndex: 'module',
      width: 150,
      fixed: 'start',
      onCell: (row) => ({ rowSpan: row.moduleRowSpan }),
      render: (module: PermissionTreeRow['module']) => (
        <span className="font-medium text-fg">{module}</span>
      ),
    },
    {
      title: '子模块',
      dataIndex: 'sub_module',
      width: 160,
      fixed: 'start',
      onCell: (row) => ({ rowSpan: row.subModuleRowSpan }),
      render: (subModule: string) => <span className="text-fg-2">{subModule || '—'}</span>,
    },
    {
      title: '权限项',
      dataIndex: 'name',
      width: 280,
      render: (_: unknown, row) => (
        <div>
          <div className="text-fg">{row.name}</div>
          <div className="font-mono text-xs text-fg-3">{row.code}</div>
        </div>
      ),
    },
  ]

  const roleColumns: NonNullable<TableProps<PermissionTreeRow>['columns']> = roles.map((role) => ({
    key: `role-${role.role_id}`,
    title: role.is_super_admin ? (
      <Tooltip title="超级管理员拥有全部权限，不可修改">
        <span className="inline-flex items-center gap-1">{role.name}</span>
      </Tooltip>
    ) : (
      role.name
    ),
    width: ROLE_WIDTH,
    align: 'center' as const,
    render: (_: unknown, row) => {
      if (role.is_super_admin) {
        return (
          <Tooltip title="超级管理员拥有全部权限，不可修改">
            <span className="inline-flex">
              <Checkbox disabled aria-label={`${role.name}：${row.name}，只读`} />
            </span>
          </Tooltip>
        )
      }
      if (failedRoleIds.has(role.role_id)) {
        return (
          <Tooltip title="权限加载失败">
            <span className="text-fg-3">—</span>
          </Tooltip>
        )
      }
      if (loadingRoleIds.has(role.role_id)) {
        return <Skeleton.Button size="small" active />
      }
      if (!canEdit) {
        return (
          <Tooltip title="当前账号没有修改角色权限的权限">
            <span className="inline-flex">
              <Checkbox
                checked={codesByRole.get(role.role_id)?.has(row.code) ?? false}
                disabled
                aria-label={`${role.name}：${row.name}，只读`}
              />
            </span>
          </Tooltip>
        )
      }
      return (
        <Checkbox
          checked={codesByRole.get(role.role_id)?.has(row.code) ?? false}
          disabled={savingRoleIds.has(role.role_id)}
          onChange={(event) => onToggle(role.role_id, row, event.target.checked)}
          aria-label={`${role.name}：${row.name}`}
        />
      )
    },
  }))

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-card shadow-card">
      {failedRoleIds.size > 0 && (
        <Alert
          type="warning"
          showIcon
          className="m-4 mb-0"
          title="部分角色权限加载失败"
          description="失败的角色列暂不可编辑。"
          action={
            <Button size="small" onClick={onRetryFailed}>
              重试
            </Button>
          }
        />
      )}
      <Table<PermissionTreeRow>
        rowKey="permission_id"
        columns={[...columns, ...roleColumns]}
        dataSource={rows}
        loading={loading}
        pagination={false}
        scroll={{ x: Math.max(980, BASE_WIDTH + roles.length * ROLE_WIDTH) }}
        locale={{ emptyText: '暂无可分配的权限项' }}
      />
    </div>
  )
}
