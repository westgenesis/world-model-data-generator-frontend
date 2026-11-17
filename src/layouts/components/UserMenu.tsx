import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import type { MenuProps } from 'antd'
import { Avatar, Dropdown } from 'antd'
import { ChevronDown, LogOut, KeyRound, UserRound } from 'lucide-react'
import { useState } from 'react'
import { currentUserQueryOptions, logout } from '@/api/auth'
import { ChangePasswordModal } from '@/features/auth/components/ChangePasswordModal'
import { useAuthStore } from '@/stores/auth-store'

/** 顶栏用户菜单：当前用户信息、个人设置、修改密码、退出登录 */
export const UserMenu = () => {
  const { data: user } = useQuery(currentUserQueryOptions)
  const refreshToken = useAuthStore((s) => s.refreshToken)
  const clearAuth = useAuthStore((s) => s.clear)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [passwordOpen, setPasswordOpen] = useState(false)

  const name = user?.full_name || user?.username || '…'
  /** 首次登录或密码被重置时强制修改密码，弹窗不可关闭；开发环境不自动弹出，避免阻碍本地调试 */
  const mustChangePassword = (user?.must_change_password ?? false) && !import.meta.env.DEV

  /**
   * 退出登录：作废后端刷新令牌，清空本地令牌，跳转登录页后再清空查询缓存。
   * 缓存必须在跳转之后清理：跳转会卸载当前布局（含本组件的 useQuery 观察者），
   * 若先 clear 缓存，仍被观察的 ['auth','me'] 查询会被触发重新请求 /users/me。
   */
  const handleLogout = async () => {
    try {
      if (refreshToken) await logout({ refresh_token: refreshToken })
    } catch {
      // 后端登出失败不阻断本地退出
    }
    clearAuth()
    await navigate({ to: '/login', replace: true })
    queryClient.clear()
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
    {
      key: 'password',
      icon: <KeyRound size={15} strokeWidth={1.75} />,
      label: '修改密码',
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
    <>
      <Dropdown
        trigger={['click']}
        // TODO: 个人设置待后端提供接口后实现
        menu={{
          items,
          onClick: ({ key }) => {
            if (key === 'logout') void handleLogout()
            if (key === 'password') setPasswordOpen(true)
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

      <ChangePasswordModal
        open={passwordOpen || mustChangePassword}
        forced={mustChangePassword}
        onClose={() => setPasswordOpen(false)}
      />
    </>
  )
}
