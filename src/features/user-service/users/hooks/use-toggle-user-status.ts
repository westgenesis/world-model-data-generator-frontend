import { App } from 'antd'
import type { User } from '@/api/users'
import { unlockUser, updateUserStatus, USERS_QUERY_KEY } from '@/api/users'
import { useActionMutation } from '@/hooks/use-action-mutation'

/**
 * 启用 / 停用用户：停用前二次确认，启用直接执行
 * @returns 触发切换的函数
 */
export const useToggleUserStatus = () => {
  const { modal } = App.useApp()
  const mutation = useActionMutation({
    mutationFn: (user: User) => updateUserStatus(user.user_id, user.status !== 'active'),
    successMessage: (_, user) => (user.status === 'active' ? '已停用' : '已启用'),
    invalidateKeys: [USERS_QUERY_KEY],
  })

  return (user: User) => {
    if (user.status !== 'active') {
      mutation.mutate(user)
      return
    }
    modal.confirm({
      title: `停用用户「${user.full_name}」？`,
      content: '停用后该账号将无法登录，已分配的权限与项目成员关系保留，可随时重新启用。',
      okText: '停用',
      okButtonProps: { danger: true },
      onOk: () => mutation.mutateAsync(user),
    })
  }
}

/**
 * 解除用户登录限流（当前 IP 失败次数清零）
 * @returns 触发解除的函数
 */
export const useUnlockUser = () => {
  const mutation = useActionMutation({
    mutationFn: (user: User) => unlockUser(user.user_id),
    successMessage: (_, user) => `已解除「${user.full_name}」的登录限流`,
    invalidateKeys: [USERS_QUERY_KEY],
  })

  return mutation.mutate
}
