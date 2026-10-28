import { GlobalOutlined, LogoutOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { Avatar, Dropdown } from 'antd'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES } from '@/i18n'

/** 顶栏用户头像菜单：语言切换、退出登录 */
export const UserMenu = () => {
  const { t, i18n } = useTranslation()

  const items: MenuProps['items'] = [
    {
      key: 'language',
      icon: <GlobalOutlined />,
      label: t('topbar.language'),
      children: SUPPORTED_LANGUAGES.map((l) => ({ key: `lang:${l.value}`, label: l.label })),
    },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: t('topbar.logout'), danger: true },
  ]

  /**
   * 处理菜单点击
   * @param info.key - 被点击的菜单键
   */
  const onClick: MenuProps['onClick'] = ({ key }) => {
    if (key.startsWith('lang:')) void i18n.changeLanguage(key.slice(5))
    // TODO: 接入登录体系后实现退出登录
  }

  return (
    <Dropdown
      menu={{ items, onClick, selectable: true, selectedKeys: [`lang:${i18n.resolvedLanguage}`] }}
    >
      <Avatar size={28} className="cursor-pointer bg-primary">
        李
      </Avatar>
    </Dropdown>
  )
}
