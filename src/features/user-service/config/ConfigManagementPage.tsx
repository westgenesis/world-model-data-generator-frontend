import { Tabs } from 'antd'
import { PageHeader } from '@/components/PageHeader'
import { AccountSecurityTab } from './components/AccountSecurityTab'

/** 统一配置管理页面（接口：GET / PUT /v1/settings） */
export const ConfigManagementPage = () => {
  return (
    <>
      <PageHeader
        title="统一配置管理"
        description="集中维护系统级配置，修改后对本系统全部用户生效。"
      />
      <Tabs
        defaultActiveKey="account-security"
        items={[{ key: 'account-security', label: '账号安全', children: <AccountSecurityTab /> }]}
      />
    </>
  )
}
