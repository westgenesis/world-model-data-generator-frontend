import type { TreeDataNode, TreeProps } from 'antd'
import { Button, Empty, Input, Spin, Tree } from 'antd'
import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Permission } from '@/api/permissions'
import { buildPermissionTree } from '@/hooks/use-permission-tree'

interface PermissionTreeSelectProps {
  /** 全部权限（组件内部只展示启用且非孤立的权限） */
  permissions: Permission[]
  /** 已选权限 code（受控，供 Form.Item 注入） */
  value?: string[]
  /** 选择变化 */
  onChange?: (codes: string[]) => void
  /** 权限列表加载中 */
  loading?: boolean
  /** 禁用选择 */
  disabled?: boolean
  /** 树区域最大高度，默认 360 */
  maxHeight?: number
}

/** 模块节点 key 前缀 */
const MODULE_PREFIX = 'module:'

/** 子模块节点 key 前缀 */
const SUBMODULE_PREFIX = 'submodule:'

/** 筛选结果 */
interface FilteredTree {
  data: TreeDataNode[]
  /** 命中的权限项数量 */
  count: number
}

/**
 * 按关键词筛选权限树：模块或子模块命中时展示其全部权限，
 * 否则只保留名称 / code 命中的权限项
 * @param groups - 模块分组
 * @param keyword - 搜索关键词
 * @returns 筛选后的树数据与命中数量
 */
const filterTree = (
  groups: ReturnType<typeof buildPermissionTree>['groups'],
  keyword: string,
): FilteredTree => {
  const kw = keyword.trim().toLowerCase()
  let count = 0

  const data = groups.flatMap((group) => {
    const moduleHit = group.module.toLowerCase().includes(kw)
    const subModules = group.subModules.flatMap((sub) => {
      const subHit = sub.subModule.toLowerCase().includes(kw)
      const permissions =
        kw && !moduleHit && !subHit
          ? sub.permissions.filter(
              (permission) =>
                permission.name.toLowerCase().includes(kw) ||
                permission.code.toLowerCase().includes(kw),
            )
          : sub.permissions
      if (permissions.length === 0) return []
      count += permissions.length
      return [
        {
          key: `${SUBMODULE_PREFIX}${group.module}/${sub.subModule}`,
          title: sub.subModule || '未分组',
          selectable: false,
          children: permissions.map((permission) => ({
            key: permission.code,
            title: (
              <span className="inline-flex flex-wrap items-baseline gap-x-2">
                <span className="text-fg">{permission.name}</span>
                <span className="font-mono text-xs text-fg-3">{permission.code}</span>
              </span>
            ),
          })),
        },
      ]
    })
    if (subModules.length === 0) return []
    return [
      {
        key: `${MODULE_PREFIX}${group.module}`,
        title: group.module,
        selectable: false,
        children: subModules,
      },
    ]
  })

  return { data, count }
}

/**
 * 权限选择树：按模块 / 子模块分组勾选权限，支持关键词搜索、全选与清空，
 * 可作为 Form.Item 的受控组件使用
 * @param props - 权限列表、已选 code 与变化回调
 */
export const PermissionTreeSelect = ({
  permissions,
  value = [],
  onChange,
  loading = false,
  disabled = false,
  maxHeight = 360,
}: PermissionTreeSelectProps) => {
  const [keyword, setKeyword] = useState('')
  const tree = useMemo(() => buildPermissionTree(permissions), [permissions])
  const filtered = useMemo(() => filterTree(tree.groups, keyword), [tree.groups, keyword])

  /** 可勾选的权限 code，用于剔除模块 / 子模块节点 key */
  const codeSet = useMemo(
    () =>
      new Set(
        tree.groups.flatMap((group) =>
          group.subModules.flatMap((sub) => sub.permissions.map((item) => item.code)),
        ),
      ),
    [tree.groups],
  )

  const checkedKeys = useMemo(() => value.filter((code) => codeSet.has(code)), [value, codeSet])

  /** 当前筛选结果中的全部权限 code，用于「全选」 */
  const visibleCodes = useMemo(() => {
    const codes: string[] = []
    for (const node of filtered.data) {
      for (const sub of node.children ?? []) {
        for (const leaf of sub.children ?? []) codes.push(String(leaf.key))
      }
    }
    return codes
  }, [filtered.data])

  /** 处理勾选：只保留权限 code，丢弃自动推导出的模块 / 子模块节点 */
  const handleCheck: NonNullable<TreeProps['onCheck']> = (checked) => {
    const keys = Array.isArray(checked) ? checked : checked.checked
    onChange?.(keys.filter((key): key is string => typeof key === 'string' && codeSet.has(key)))
  }

  /** 全选当前可见权限（与已选合并） */
  const selectAllVisible = () => onChange?.([...new Set([...checkedKeys, ...visibleCodes])])

  /** 清空全部已选权限 */
  const clearAll = () => onChange?.([])

  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <div className="flex items-center gap-2 border-b border-line bg-sunken px-3 py-2">
        <Input
          variant="borderless"
          size="small"
          allowClear
          prefix={<Search size={14} className="text-fg-3" />}
          placeholder="搜索权限名称 / code"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
        <span className="shrink-0 text-xs text-fg-2 tabular-nums">
          已选 {checkedKeys.length}
          {keyword ? ` / 当前 ${filtered.count}` : ` / 共 ${tree.permissionCount}`}
        </span>
        <Button
          type="link"
          size="small"
          className="shrink-0"
          disabled={disabled}
          onClick={selectAllVisible}
        >
          全选
        </Button>
        <Button
          type="link"
          size="small"
          className="shrink-0"
          disabled={disabled || checkedKeys.length === 0}
          onClick={clearAll}
        >
          清空
        </Button>
      </div>
      <Spin spinning={loading}>
        <div className="overflow-auto p-2" style={{ maxHeight }}>
          {filtered.data.length === 0 ? (
            <Empty
              className="my-8"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                loading ? '正在加载权限…' : keyword ? '没有匹配的权限' : '暂无可授权权限'
              }
            />
          ) : (
            <Tree
              key={keyword}
              checkable
              defaultExpandAll
              disabled={disabled}
              treeData={filtered.data}
              checkedKeys={checkedKeys}
              onCheck={handleCheck}
            />
          )}
        </div>
      </Spin>
    </div>
  )
}
