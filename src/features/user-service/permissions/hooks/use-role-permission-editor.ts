import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query'
import { App } from 'antd'
import { useRef, useState } from 'react'
import type { Permission } from '@/api/permissions'
import type { Role, RoleDetail } from '@/api/roles'
import { roleDetailQueryKey, roleDetailQueryOptions, updateRolePermissions } from '@/api/roles'
import { getErrorMessage } from '@/lib/http'

/* --------------------------------- 类型 --------------------------------- */

/** 勾选保存的入参 */
interface ToggleVariables {
  /** 角色 ID */
  roleId: number
  /** 提交给后端的完整权限 code 列表 */
  permissionCodes: string[]
}

/** 角色权限编辑器的状态与操作 */
export interface RolePermissionEditor {
  /** 角色 ID -> 该角色已持有的权限 code */
  codesByRole: ReadonlyMap<number, ReadonlySet<string>>
  /** 角色详情加载中的角色 */
  loadingRoleIds: ReadonlySet<number>
  /** 角色详情加载失败的角色 */
  failedRoleIds: ReadonlySet<number>
  /** 正在保存权限的角色 */
  savingRoleIds: ReadonlySet<number>
  /** 切换角色的某项权限并立即保存 */
  toggle: (roleId: number, permission: Permission, checked: boolean) => void
  /** 重新拉取加载失败的角色详情 */
  retryFailed: () => void
  /** 重新拉取全部角色详情 */
  refetchAll: () => void
}

/* --------------------------------- Hook --------------------------------- */

/**
 * 角色权限编辑：并行加载各角色详情，勾选后以完整权限集覆盖保存
 * @param roles - 角色列表
 * @returns 角色权限状态与操作
 */
export const useRolePermissionEditor = (roles: Role[]): RolePermissionEditor => {
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  /** 正在保存的角色，同步读写以拦截同一角色的并发提交 */
  const pendingRoleIds = useRef<Set<number>>(new Set())
  const [savingRoleIds, setSavingRoleIds] = useState<ReadonlySet<number>>(new Set())

  const detailQueries = useQueries({
    queries: roles.map((role) => roleDetailQueryOptions(role.role_id)),
  })

  const codesByRole = new Map<number, ReadonlySet<string>>()
  const loadingRoleIds = new Set<number>()
  const failedRoleIds = new Set<number>()

  roles.forEach((role, index) => {
    const query = detailQueries[index]
    codesByRole.set(role.role_id, new Set(query.data?.permission_codes ?? []))
    if (query.isPending) loadingRoleIds.add(role.role_id)
    if (query.isError) failedRoleIds.add(role.role_id)
  })

  const syncSavingRoleIds = () => setSavingRoleIds(new Set(pendingRoleIds.current))

  const mutation = useMutation({
    mutationFn: ({ roleId, permissionCodes }: ToggleVariables) =>
      updateRolePermissions(roleId, permissionCodes),
    onMutate: async ({ roleId, permissionCodes }) => {
      const queryKey = roleDetailQueryKey(roleId)
      // 取消进行中的重取，避免其覆盖乐观数据
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<RoleDetail>(queryKey)

      queryClient.setQueryData<RoleDetail>(queryKey, (old) =>
        old ? { ...old, permission_codes: permissionCodes } : old,
      )

      return { previous }
    },
    onError: (error, { roleId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(roleDetailQueryKey(roleId), context.previous)
      }
      message.error(getErrorMessage(error, '权限保存失败，已恢复原状态'))
    },
    onSettled: (_data, _error, { roleId }) => {
      pendingRoleIds.current.delete(roleId)
      syncSavingRoleIds()
      // 仅标记过期，不立即重取，避免勾选框闪烁
      void queryClient.invalidateQueries({
        queryKey: roleDetailQueryKey(roleId),
        refetchType: 'none',
      })
    },
  })

  const toggle = (roleId: number, permission: Permission, checked: boolean): void => {
    if (pendingRoleIds.current.has(roleId)) return

    const queryKey = roleDetailQueryKey(roleId)
    const current = queryClient.getQueryData<RoleDetail>(queryKey)
    if (!current) return

    // 以角色完整权限集为基准增删，保留表格未展示的停用 / 孤儿权限
    const nextCodes = new Set(current.permission_codes)
    if (checked) nextCodes.add(permission.code)
    else nextCodes.delete(permission.code)

    pendingRoleIds.current.add(roleId)
    syncSavingRoleIds()
    mutation.mutate({ roleId, permissionCodes: [...nextCodes] })
  }

  const retryFailed = (): void => {
    detailQueries.forEach((query) => {
      if (query.isError) void query.refetch()
    })
  }

  const refetchAll = (): void => {
    detailQueries.forEach((query) => void query.refetch())
  }

  return {
    codesByRole,
    loadingRoleIds,
    failedRoleIds,
    savingRoleIds,
    toggle,
    retryFailed,
    refetchAll,
  }
}
