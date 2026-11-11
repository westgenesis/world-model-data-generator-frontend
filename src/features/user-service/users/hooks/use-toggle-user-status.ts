import { App } from 'antd'
import type { User } from '@/api/users'
import { updateUserStatus, USERS_QUERY_KEY } from '@/api/users'
import { useActionMutation } from '@/hooks/use-action-mutation'

/**
 * 启用 / 停用用户：停用前二次确认，启用直接执行
 * @returns 触发切换的函数
 */
export const useToggleUserStatus = () => {
  const { modal } = App.useApp()
  const mutation = useActionMutation({
    mutationFn: (user: User) =>
      updateUserStatus(user.id, user.status === 'enabled' ? 'disabled' : 'enabled'),
    successMessage: (_, user) => (user.status === 'enabled' ? '已停用' : '已启用'),
    invalidateKeys: [USERS_QUERY_KEY],
  })

  return (user: User) => {
    if (user.status === 'disabled') {
      mutation.mutate(user)
      return
    }
    modal.confirm({
      title: `停用用户「${user.name}」？`,
      content: '停用后该账号将无法登录，已分配的权限与项目成员关系保留，可随时重新启用。',
      okText: '停用',
      okButtonProps: { danger: true },
      onOk: () => mutation.mutateAsync(user),
    })
  }
}
