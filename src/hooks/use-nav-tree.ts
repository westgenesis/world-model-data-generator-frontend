import { useMemo } from 'react'
import type { NavLeaf, NavNode } from '@/config/navigation'
import { filterNavTree, flattenLeaves, NAV_TREE } from '@/config/navigation'
import { usePermissions } from './use-permissions'

/** 按当前用户权限裁剪后的导航树 */
export interface NavTree {
  /** 顶级模块列表，仅保留至少有一个可访问页面的模块 */
  modules: NavNode[]
  /** 全部可访问的叶子页面 */
  leaves: NavLeaf[]
}

/**
 * 当前用户可见的导航树：权限变化时重新裁剪，模块级常量不可直接过滤
 * @returns 裁剪后的模块与叶子
 */
export const useNavTree = (): NavTree => {
  const { hasAny } = usePermissions()
  return useMemo(() => {
    const modules = filterNavTree(NAV_TREE, hasAny)
    return { modules, leaves: flattenLeaves(modules) }
  }, [hasAny])
}
