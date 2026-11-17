import { useQuery } from '@tanstack/react-query'
import { Alert, App, Button, Select } from 'antd'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import type { UserGrant, UserGrantBatch } from '@/api/user-grants'
import {
  revokeUserGrants,
  USER_GRANTS_QUERY_KEY,
  userGrantListQueryOptions,
} from '@/api/user-grants'
import { FilterBar, FilterField } from '@/components/FilterBar'
import type { UserGrantStatus } from '@/constants/enums'
import { UserGrantStatus as UserGrantStatusEnum } from '@/constants/enums'
import { UserSelect } from '@/features/user-service/components/UserSelect'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { useDrawerState } from '@/hooks/use-drawer-state'
import { useListParams } from '@/hooks/use-list-params'
import { ExtendGrantModal } from './ExtendGrantModal'
import { GrantFormModal } from './GrantFormModal'
import { UserGrantTable } from './UserGrantTable'

/** 临时授权列表筛选条件 */
interface GrantFilters {
  /** 用户标识 */
  userId?: number
  /** 授权状态 */
  status?: UserGrantStatus
}

/**
 * 用户权限分配 Tab：查询临时授权记录，支持新增、延期与收回（含批量操作）
 */
export const UserGrantTab = () => {
  const { filters, setFilter, submit, reset, params, getPagination } = useListParams<GrantFilters>(
    {},
    { manualSearch: true },
  )
  const query = useQuery(userGrantListQueryOptions(params))
  const grants = query.data?.items ?? []
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([])
  const selectedGrants = grants.filter((grant) => selectedRowKeys.includes(grant.grant_id))

  const grantModal = useDrawerState()
  const extendModal = useDrawerState<UserGrant[]>()

  const { modal } = App.useApp()
  const revokeMutation = useActionMutation<number[], UserGrantBatch>({
    mutationFn: (grantIds) => revokeUserGrants(grantIds),
    successMessage: (result) => `已收回 ${result.affected} 条授权`,
    invalidateKeys: [USER_GRANTS_QUERY_KEY],
    onSuccess: () => setSelectedRowKeys([]),
  })

  /**
   * 确认收回授权（单条或批量）
   * @param targets - 需要收回的授权记录
   */
  const confirmRevoke = (targets: UserGrant[]) => {
    if (targets.length === 0) return
    modal.confirm({
      title: `确认收回 ${targets.length} 条授权？`,
      content: '收回后用户将立即失去对应权限，该操作不可撤销。',
      okText: '确认收回',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () =>
        revokeMutation.mutateAsync(targets.map((grant) => grant.grant_id)).then(
          () => undefined,
          () => undefined,
        ),
    })
  }

  /** 提交筛选并清空当前勾选 */
  const handleSearch = () => {
    setSelectedRowKeys([])
    submit()
  }

  /** 重置筛选并清空当前勾选 */
  const handleReset = () => {
    setSelectedRowKeys([])
    reset()
  }

  const pagination = getPagination(query.data?.total)

  /** 翻页时清空勾选，避免跨页批量操作 */
  const handlePageChange = (page: number, pageSize: number) => {
    setSelectedRowKeys([])
    pagination.onChange?.(page, pageSize)
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-fg-2">
          共 <span className="font-medium text-fg tabular-nums">{query.data?.total ?? 0}</span>{' '}
          条临时授权
          {selectedRowKeys.length > 0 && (
            <>
              ，已选{' '}
              <span className="font-medium text-fg tabular-nums">{selectedRowKeys.length}</span> 条
            </>
          )}
        </span>
        <div className="ms-auto flex flex-wrap items-center gap-2">
          <Button
            danger
            disabled={selectedRowKeys.length === 0}
            onClick={() => confirmRevoke(selectedGrants)}
          >
            批量收回
          </Button>
          <Button
            disabled={selectedRowKeys.length === 0}
            onClick={() => extendModal.show(selectedGrants)}
          >
            批量延期
          </Button>
          <Button
            type="primary"
            icon={<Plus size={16} strokeWidth={1.75} />}
            onClick={() => grantModal.show()}
          >
            添加授权
          </Button>
        </div>
      </div>

      <FilterBar onSearch={handleSearch} onReset={handleReset}>
        <FilterField label="用户">
          <UserSelect
            className="w-56"
            allowClear
            placeholder="全部"
            value={filters.userId}
            onChange={(value) => setFilter('userId', value)}
          />
        </FilterField>
        <FilterField label="状态">
          <Select
            className="w-32"
            allowClear
            placeholder="全部"
            value={filters.status}
            onChange={(value) => setFilter('status', value)}
            options={UserGrantStatusEnum.options}
          />
        </FilterField>
      </FilterBar>

      {query.isError && (
        <Alert
          type="error"
          showIcon
          className="mb-4"
          title="授权记录加载失败"
          action={
            <Button size="small" onClick={() => void query.refetch()}>
              重试
            </Button>
          }
        />
      )}

      <UserGrantTable
        data={grants}
        loading={query.isFetching}
        pagination={{ ...pagination, onChange: handlePageChange }}
        selectedRowKeys={selectedRowKeys}
        onSelectionChange={setSelectedRowKeys}
        onExtend={(grant) => extendModal.show([grant])}
        onRevoke={(grant) => confirmRevoke([grant])}
      />

      <GrantFormModal open={grantModal.open} onClose={grantModal.close} />
      <ExtendGrantModal
        open={extendModal.open}
        grants={extendModal.record ?? []}
        onClose={extendModal.close}
        onSuccess={() => setSelectedRowKeys([])}
      />
    </>
  )
}
