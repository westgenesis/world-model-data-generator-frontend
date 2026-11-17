import { useQuery } from '@tanstack/react-query'
import { Button, Empty, Result, Skeleton } from 'antd'
import { permissionListQueryOptions } from '@/api/permissions'
import { roleListQueryOptions } from '@/api/roles'
import { usePermissionTree } from '@/hooks/use-permission-tree'
import { useRolePermissionEditor } from '../hooks/use-role-permission-editor'
import { RolePermissionTable } from './RolePermissionTable'

/** 卡片容器样式，与项目现有区块保持一致 */
const CARD_CLASS = 'rounded-xl border border-line bg-card p-5 shadow-card'

/**
 * 角色权限分配 Tab：展示权限项与角色的勾选矩阵，勾选后立即保存
 */
export const RolePermissionTab = () => {
  const permissionsQuery = useQuery(permissionListQueryOptions)
  const rolesQuery = useQuery(roleListQueryOptions)
  const roles = rolesQuery.data ?? []
  const tree = usePermissionTree(permissionsQuery.data ?? [])
  const editor = useRolePermissionEditor(roles)

  /** 重新加载权限与角色基础数据 */
  const reloadBaseData = () => {
    void permissionsQuery.refetch()
    void rolesQuery.refetch()
  }

  /** 重新加载基础数据与全部角色详情 */
  const reloadAll = () => {
    reloadBaseData()
    editor.refetchAll()
  }

  if (permissionsQuery.isPending || rolesQuery.isPending) {
    return (
      <div className={CARD_CLASS}>
        <Skeleton active paragraph={{ rows: 10 }} />
      </div>
    )
  }

  if (permissionsQuery.isError || rolesQuery.isError) {
    return (
      <div className={CARD_CLASS}>
        <Result
          status="error"
          title="权限数据加载失败"
          subTitle="请检查网络后重试"
          extra={
            <Button type="primary" onClick={reloadBaseData}>
              重试
            </Button>
          }
        />
      </div>
    )
  }

  if (roles.length === 0) {
    return (
      <div className={CARD_CLASS}>
        <Empty description="暂无角色，无法分配权限" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-fg-2">
        <span>
          共 {tree.moduleCount} 个模块 / {tree.subModuleCount} 个子模块 / {tree.permissionCount}{' '}
          项权限
        </span>
        <span className="text-fg-3">勾选后立即保存，无需提交</span>
        <Button
          size="small"
          className="ms-auto"
          loading={permissionsQuery.isFetching || rolesQuery.isFetching}
          onClick={reloadAll}
        >
          刷新
        </Button>
      </div>
      <RolePermissionTable
        rows={tree.rows}
        roles={roles}
        codesByRole={editor.codesByRole}
        loadingRoleIds={editor.loadingRoleIds}
        failedRoleIds={editor.failedRoleIds}
        savingRoleIds={editor.savingRoleIds}
        loading={permissionsQuery.isFetching || rolesQuery.isFetching}
        onToggle={editor.toggle}
        onRetryFailed={editor.retryFailed}
      />
    </div>
  )
}
