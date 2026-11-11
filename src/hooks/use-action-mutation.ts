import type { QueryKey } from '@tanstack/react-query'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { App } from 'antd'
import { getErrorMessage } from '@/lib/http'

interface ActionMutationOptions<TVariables, TData> {
  /** 实际发起请求的函数 */
  mutationFn: (variables: TVariables) => Promise<TData>
  /** 成功提示文案；返回函数时可根据结果动态生成，传 false 不提示 */
  successMessage?: string | false | ((data: TData, variables: TVariables) => string)
  /** 成功后需要失效的 queryKey 列表 */
  invalidateKeys?: QueryKey[]
  /** 成功回调（在提示与失效之后执行） */
  onSuccess?: (data: TData, variables: TVariables) => void
}

/**
 * 写操作的统一封装：成功后提示并刷新相关查询，失败时提示后端返回的错误信息
 * @param options - 请求函数、提示文案与需失效的查询
 * @returns TanStack Query mutation 对象
 */
export const useActionMutation = <TVariables = void, TData = unknown>({
  mutationFn,
  successMessage = '操作成功',
  invalidateKeys = [],
  onSuccess,
}: ActionMutationOptions<TVariables, TData>) => {
  const { message } = App.useApp()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onSuccess: async (data, variables) => {
      if (successMessage !== false) {
        message.success(
          typeof successMessage === 'function' ? successMessage(data, variables) : successMessage,
        )
      }
      await Promise.all(
        invalidateKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      )
      onSuccess?.(data, variables)
    },
    onError: (error) => {
      message.error(getErrorMessage(error))
    },
  })
}
