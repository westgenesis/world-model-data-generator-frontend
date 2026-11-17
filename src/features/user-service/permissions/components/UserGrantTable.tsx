import type { TablePaginationConfig, TableProps } from 'antd'
import { Button, Table, Tooltip } from 'antd'
import type { UserGrant } from '@/api/user-grants'
import { EnumTag } from '@/components/EnumTag'
import { UserGrantStatus } from '@/constants/enums'
import { EMPTY_TEXT, formatDateTime } from '@/lib/format'

interface UserGrantTableProps {
  data: UserGrant[]
  loading: boolean
  pagination: TablePaginationConfig
  /** 已勾选的授权 ID */
  selectedRowKeys: number[]
  /** 勾选变化 */
  onSelectionChange: (keys: number[]) => void
  /** 延期单条授权 */
  onExtend: (grant: UserGrant) => void
  /** 收回单条授权 */
  onRevoke: (grant: UserGrant) => void
}

/**
 * 未生效 / 生效中的授权可延期或收回，已过期与已撤销的授权不可再操作
 * @param grant - 授权记录
 * @returns 是否可操作
 */
const isGrantOperable = (grant: UserGrant): boolean =>
  grant.status === 'pending' || grant.status === 'active'

/**
 * 临时授权记录表格
 * @param props - 数据、分页、勾选状态与行操作回调
 */
export const UserGrantTable = ({
  data,
  loading,
  pagination,
  selectedRowKeys,
  onSelectionChange,
  onExtend,
  onRevoke,
}: UserGrantTableProps) => {
  const columns: TableProps<UserGrant>['columns'] = [
    {
      title: '用户',
      dataIndex: 'full_name',
      width: 150,
      render: (_: unknown, grant) => (
        <div>
          <div className="font-medium text-fg">{grant.full_name ?? grant.username}</div>
          <div className="font-mono text-xs text-fg-3">{grant.username}</div>
        </div>
      ),
    },
    {
      title: '附加权限',
      dataIndex: 'permission_name',
      width: 220,
      render: (_: unknown, grant) => (
        <div>
          <div className="text-fg">{grant.permission_name}</div>
          <div className="font-mono text-xs text-fg-3">{grant.permission_code}</div>
        </div>
      ),
    },
    {
      title: '生效期',
      dataIndex: 'effective_from',
      width: 210,
      render: (_: unknown, grant) => (
        <div className="text-[13px] text-fg-2 tabular-nums">
          <div>{formatDateTime(grant.effective_from)}</div>
          <div className="text-fg-3">至 {formatDateTime(grant.effective_to)}</div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 96,
      render: (status: UserGrant['status']) => <EnumTag enumDef={UserGrantStatus} value={status} />,
    },
    {
      title: '授权原因',
      dataIndex: 'reason',
      ellipsis: { showTitle: false },
      render: (reason: string) =>
        reason ? (
          <Tooltip title={reason} placement="topLeft">
            <span>{reason}</span>
          </Tooltip>
        ) : (
          <span className="text-fg-3">{EMPTY_TEXT}</span>
        ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 130,
      render: (value: string) => (
        <span className="text-fg-2 tabular-nums">{formatDateTime(value, 'YYYY-MM-DD')}</span>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 130,
      fixed: 'end',
      render: (_, grant) => {
        const operable = isGrantOperable(grant)
        return (
          <Tooltip title={operable ? undefined : '已过期或已撤销的授权不可操作'}>
            <div className="-ms-2 flex items-center">
              <Button type="link" size="small" disabled={!operable} onClick={() => onExtend(grant)}>
                延期
              </Button>
              <Button
                type="link"
                size="small"
                danger
                disabled={!operable}
                onClick={() => onRevoke(grant)}
              >
                收回
              </Button>
            </div>
          </Tooltip>
        )
      },
    },
  ]

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-card shadow-card">
      <Table<UserGrant>
        rowKey="grant_id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ ...pagination, className: 'px-4' }}
        scroll={{ x: 1100 }}
        rowSelection={{
          selectedRowKeys,
          preserveSelectedRowKeys: false,
          onChange: (keys) => onSelectionChange(keys as number[]),
          getCheckboxProps: (grant) => ({ disabled: !isGrantOperable(grant) }),
        }}
        locale={{ emptyText: '暂无临时授权记录' }}
      />
    </div>
  )
}
