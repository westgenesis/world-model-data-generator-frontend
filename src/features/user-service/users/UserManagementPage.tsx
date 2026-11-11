import { useQuery } from '@tanstack/react-query'
import { Button, Input, Select } from 'antd'
import { Plus, Upload } from 'lucide-react'
import type { User } from '@/api/users'
import { userListQueryOptions } from '@/api/users'
import { FilterBar, FilterField } from '@/components/FilterBar'
import { PageHeader } from '@/components/PageHeader'
import type { UserStatus } from '@/constants/enums'
import { UserStatus as UserStatusEnum } from '@/constants/enums'
import { useDrawerState } from '@/hooks/use-drawer-state'
import { useListParams } from '@/hooks/use-list-params'
import { UserFormDrawer } from './components/UserFormDrawer'
import { UserGrantDrawer } from './components/UserGrantDrawer'
import { UserImportDrawer } from './components/UserImportDrawer'
import { UserStats } from './components/UserStats'
import { UserTable } from './components/UserTable'
import { useToggleUserStatus } from './hooks/use-toggle-user-status'

/** 用户列表筛选条件 */
interface UserFilters {
  status?: UserStatus
  keyword: string
}

/** 用户管理页面（参考 docs/原型/M1用户服务管理_原型.html） */
export const UserManagementPage = () => {
  const { filters, setFilter, reset, params, getPagination } = useListParams<UserFilters>({
    keyword: '',
  })
  const { data, isFetching } = useQuery(userListQueryOptions(params))

  const formDrawer = useDrawerState<User>()
  const grantDrawer = useDrawerState<User>()
  const importDrawer = useDrawerState()
  const toggleStatus = useToggleUserStatus()

  return (
    <>
      <PageHeader
        title="用户管理"
        description="维护平台用户身份、所属部门与账号启停状态；权限在「权限管理」中按人分配。"
        extra={
          <>
            <Button
              icon={<Upload size={16} strokeWidth={1.75} />}
              onClick={() => importDrawer.show()}
            >
              批量导入
            </Button>
            <Button
              type="primary"
              icon={<Plus size={16} strokeWidth={1.75} />}
              onClick={() => formDrawer.show()}
            >
              新增用户
            </Button>
          </>
        }
      />

      <UserStats />

      <FilterBar onReset={reset}>
        <FilterField label="状态">
          <Select
            className="w-32"
            placeholder="全部"
            allowClear
            value={filters.status}
            onChange={(value) => setFilter('status', value)}
            options={UserStatusEnum.options}
          />
        </FilterField>
        <FilterField label="关键词">
          <Input
            className="w-56"
            placeholder="姓名 / 账号"
            allowClear
            value={filters.keyword}
            onChange={(e) => setFilter('keyword', e.target.value)}
          />
        </FilterField>
      </FilterBar>

      <UserTable
        data={data?.list ?? []}
        loading={isFetching}
        pagination={getPagination(data?.total)}
        onEdit={formDrawer.show}
        onGrant={grantDrawer.show}
        onToggleStatus={toggleStatus}
      />

      <UserFormDrawer open={formDrawer.open} user={formDrawer.record} onClose={formDrawer.close} />
      <UserGrantDrawer
        open={grantDrawer.open}
        user={grantDrawer.record}
        onClose={grantDrawer.close}
      />
      <UserImportDrawer open={importDrawer.open} onClose={importDrawer.close} />
    </>
  )
}
