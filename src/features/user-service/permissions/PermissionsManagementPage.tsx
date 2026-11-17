import { Tabs } from 'antd'
import { PageHeader } from '@/components/PageHeader'
import { RolePermissionTab } from './components/RolePermissionTab'
import { UserGrantTab } from './components/UserGrantTab'

/** 权限管理页面 */
export const PermissionsManagementPage = () => {
  return (
    <>
      <PageHeader
        title="权限管理"
        description="权限定义、角色授权、用户授权与访问校验的全链路管理。"
      />
      <Tabs
        defaultActiveKey="role-permission"
        items={[
          {
            key: 'role-permission',
            label: '角色权限分配',
            children: <RolePermissionTab />,
          },
          {
            key: 'user-permission',
            label: '用户权限分配',
            children: <UserGrantTab />,
          },
        ]}
      />
    </>
  )
}
