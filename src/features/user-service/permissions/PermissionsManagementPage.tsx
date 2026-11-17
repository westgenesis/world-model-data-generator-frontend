import { Tabs } from 'antd'
import { Construction } from 'lucide-react'
import type { ReactNode } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { RolePermissionTab } from './components/RolePermissionTab'

interface TabPlaceholderProps {
  /** 占位说明 */
  children: ReactNode
}

/**
 * Tab 内的占位内容，用于尚未实现的 Tab
 * @param props.children - 占位说明
 */
const TabPlaceholder = ({ children }: TabPlaceholderProps) => (
  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line-strong bg-card px-6 py-24 text-center shadow-card">
    <span className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
      <Construction size={24} strokeWidth={1.75} />
    </span>
    <div className="text-base font-medium text-fg">功能开发中</div>
    <p className="mt-1 max-w-md text-fg-3">{children}</p>
  </div>
)

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
            children: <TabPlaceholder>用户权限分配功能待实现。</TabPlaceholder>,
          },
        ]}
      />
    </>
  )
}
