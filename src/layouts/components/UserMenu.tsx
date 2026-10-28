import type { MenuProps } from 'antd'
import { Avatar, Dropdown } from 'antd'
import { ChevronDown, Languages, LogOut, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES } from '@/i18n'

/** 顶栏用户菜单：个人设置、语言切换、退出登录 */
export const UserMenu = () => {
  const { t, i18n } = useTranslation()

  const items: MenuProps['items'] = [
    {
      key: 'info',
      type: 'group',
      label: (
        <div className="py-1">
          <div className="text-[13px] font-medium text-fg">李工</div>
          <div className="text-xs text-fg-3">li@example.com</div>
        </div>
      ),
    },
    { type: 'divider' },
    {
      key: 'profile',
      icon: <UserRound size={15} strokeWidth={1.75} />,
      label: t('topbar.profile'),
    },
    {
      key: 'language',
      icon: <Languages size={15} strokeWidth={1.75} />,
      label: t('topbar.language'),
      children: SUPPORTED_LANGUAGES.map((l) => ({ key: `lang:${l.value}`, label: l.label })),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogOut size={15} strokeWidth={1.75} />,
      label: t('topbar.logout'),
      danger: true,
    },
  ]

  /**
   * 处理菜单点击
   * @param info.key - 被点击的菜单键
   */
  const onClick: MenuProps['onClick'] = ({ key }) => {
    if (key.startsWith('lang:')) void i18n.changeLanguage(key.slice(5))
    // TODO: 接入登录体系后实现个人设置与退出登录
  }

  return (
    <Dropdown
      trigger={['click']}
      menu={{ items, onClick, selectable: true, selectedKeys: [`lang:${i18n.resolvedLanguage}`] }}
    >
      <button
        type="button"
        className="flex items-center gap-2 rounded-lg py-1 pr-1.5 pl-1 transition-colors hover:bg-sunken"
      >
        <Avatar size={28} className="bg-linear-135! from-[#22c1f5]! to-[#0067c7]! text-xs!">
          李
        </Avatar>
        <span className="hidden text-[13px] text-fg xl:inline">李工</span>
        <ChevronDown size={14} className="text-fg-3" />
      </button>
    </Dropdown>
  )
}
