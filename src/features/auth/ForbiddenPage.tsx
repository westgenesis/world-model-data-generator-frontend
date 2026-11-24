import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { Button, Result } from 'antd'
import { firstAccessibleLeaf, matchLeaf, NAV_TREE } from '@/config/navigation'
import { usePermissions } from '@/hooks/use-permissions'

const routeApi = getRouteApi('/_app/forbidden')

/** 403 页面：提示当前账号无权访问目标页面，并提供可访问的落点 */
export const ForbiddenPage = () => {
  const { from } = routeApi.useSearch()
  const navigate = useNavigate()
  const { hasAny } = usePermissions()
  const target = firstAccessibleLeaf(NAV_TREE, hasAny)
  const pageLabel = from ? matchLeaf(from)?.node.label : undefined

  return (
    <Result
      status="403"
      title="403"
      subTitle={
        pageLabel
          ? `当前账号没有访问「${pageLabel}」的权限，如需使用请联系管理员授权。`
          : '当前账号没有访问该页面的权限，如需使用请联系管理员授权。'
      }
      extra={
        <Button type="primary" onClick={() => void navigate({ to: target?.to ?? '/' })}>
          返回可访问页面
        </Button>
      }
    />
  )
}
