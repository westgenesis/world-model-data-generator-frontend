import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import type { MenuProps } from 'antd'
import { Avatar, Dropdown } from 'antd'
import { ChevronDown, LogOut, UserRound } from 'lucide-react'
import { currentUserQueryOptions, logout } from '@/api/auth'
import { useAuthStore } from '@/stores/auth-store'

/** 顶栏用户菜单：当前用户信息、个人设置、退出登录 */
export const UserMenu = () => {
  const { data: user } = useQuery(currentUserQueryOptions)
  const refreshToken = useAuthStore((s) => s.refreshToken)
  const clearAuth = useAuthStore((s) => s.clear)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const name = user?.full_name || user?.username || '…'

  /** 退出登录：先作废后端刷新令牌，再清空本地令牌与缓存，回到登录页 */
  const handleLogout = async () => {
    try {
      if (refreshToken) await logout({ refresh_token: refreshToken })
    } catch {
      // 后端登出失败不阻断本地退出
    }
    clearAuth()
    queryClient.clear()
    await navigate({ to: '/login', replace: true })
  }

  const items: MenuProps['items'] = [
    {
      key: 'info',
      type: 'group',
      label: (
        <div className="py-1">
          <div className="text-[13px] font-medium text-fg">{name}</div>
          <div className="text-xs text-fg-3">{user?.email ?? user?.username}</div>
        </div>
      ),
    },
    { type: 'divider' },
    {
      key: 'profile',
      icon: <UserRound size={15} strokeWidth={1.75} />,
      label: '个人设置',
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogOut size={15} strokeWidth={1.75} />,
      label: '退出登录',
      danger: true,
    },
  ]

  return (
    <Dropdown
      trigger={['click']}
      // TODO: 个人设置待后端提供接口后实现
      menu={{
        items,
        onClick: ({ key }) => {
          if (key === 'logout') void handleLogout()
        },
      }}
    >
      <button
        type="button"
        className="flex items-center gap-2 rounded-lg py-1 pr-1.5 pl-1 transition-colors hover:bg-sunken"
      >
        <Avatar size={28} className="bg-linear-135! from-[#22c1f5]! to-[#0067c7]! text-xs!">
          {name.slice(0, 1)}
        </Avatar>
        <span className="hidden text-[13px] text-fg xl:inline">{name}</span>
        <ChevronDown size={14} className="text-fg-3" />
      </button>
    </Dropdown>
  )
}
