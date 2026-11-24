import type { TabsProps } from 'antd'
import { Result, Tabs } from 'antd'
import { PageHeader } from '@/components/PageHeader'
import { PERMISSION } from '@/constants/permissions'
import { usePermissions } from '@/hooks/use-permissions'
import { RolePermissionTab } from './components/RolePermissionTab'
import { UserGrantTab } from './components/UserGrantTab'

/** 权限管理页面：仅展示当前账号有权查看的页签 */
export const PermissionsManagementPage = () => {
  const { has } = usePermissions()
  // 角色权限分配同时依赖角色与权限定义两份数据
  const canViewRole = has(PERMISSION.roleRead) && has(PERMISSION.permissionRead)
  const canViewGrant = has(PERMISSION.userPermissionRead)

  const items: TabsProps['items'] = [
    ...(canViewRole
      ? [{ key: 'role-permission', label: '角色权限分配', children: <RolePermissionTab /> }]
      : []),
    ...(canViewGrant
      ? [{ key: 'user-permission', label: '用户权限分配', children: <UserGrantTab /> }]
      : []),
  ]

  return (
    <>
      <PageHeader
        title="权限管理"
        description="权限定义、角色授权、用户授权与访问校验的全链路管理。"
      />
      {items.length > 0 ? (
        <Tabs defaultActiveKey={items[0].key} items={items} />
      ) : (
        <Result
          status="info"
          title="暂无可查看的权限内容"
          subTitle="当前账号没有角色权限或用户授权的查看权限。"
        />
      )}
    </>
  )
}
