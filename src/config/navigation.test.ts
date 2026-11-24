import { describe, expect, it } from 'vitest'
import { PERMISSION } from '@/constants/permissions'
import type { NavNode } from './navigation'
import {
  filterNavTree,
  firstAccessibleLeaf,
  flattenLeaves,
  matchLeaf,
  moduleOf,
  NAV_LEAVES,
} from './navigation'

/**
 * 构造权限判定函数
 * @param granted - 已授予的权限 code
 * @returns 任意命中的判定函数
 */
const hasAnyOf = (granted: Array<(typeof PERMISSION)[keyof typeof PERMISSION]>) => {
  const set = new Set<string>(granted)
  return (codes: readonly string[]) => codes.some((code) => set.has(code))
}

describe('navigation', () => {
  it('展开任意层级的叶子并保留祖先链', () => {
    const tree: NavNode[] = [
      {
        key: 'a',
        label: '数据生成',
        children: [
          {
            key: 'b',
            label: '生产编排',
            children: [{ key: 'c', label: '任务管理', to: '/data-gen/tasks' }],
          },
        ],
      },
    ]
    const leaves = flattenLeaves(tree)
    expect(leaves).toHaveLength(1)
    expect(leaves[0].trail.map((n) => n.key)).toEqual(['a', 'b', 'c'])
  })

  it('子路由匹配到所属页面', () => {
    expect(matchLeaf('/data-gen/tasks/GEN-1')?.node.to).toBe('/data-gen/tasks')
    expect(matchLeaf('/unknown')).toBeUndefined()
  })

  it('根据路径识别所属顶级模块', () => {
    expect(moduleOf('/data-gen/tasks/GEN-1')?.key).toBe('data-gen')
    expect(moduleOf('/user-service/projects/P-1')?.key).toBe('user-service')
    expect(moduleOf('/unknown')).toBeUndefined()
  })

  it('叶子路径全局唯一', () => {
    const paths = NAV_LEAVES.map((l) => l.node.to)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('按权限裁剪导航树并移除空目录', () => {
    const tree: NavNode[] = [
      { key: 'free', label: '自由页', to: '/data-gen/tasks' },
      {
        key: 'dir',
        label: '受控目录',
        children: [
          {
            key: 'users',
            label: '用户',
            to: '/user-service/users',
            permission: [PERMISSION.userRead],
          },
          {
            key: 'logs',
            label: '日志',
            to: '/user-service/logs',
            permission: [PERMISSION.logRead, PERMISSION.auditRead],
          },
        ],
      },
      {
        key: 'empty-dir',
        label: '全无权限目录',
        children: [
          {
            key: 'config',
            label: '配置',
            to: '/user-service/config',
            permission: [PERMISSION.settingRead],
          },
        ],
      },
    ]

    const filtered = filterNavTree(tree, hasAnyOf([PERMISSION.auditRead]))
    expect(filtered.map((node) => node.key)).toEqual(['free', 'dir'])
    expect(filtered[1].children?.map((node) => node.key)).toEqual(['logs'])
  })

  it('返回第一个可访问的叶子', () => {
    const tree: NavNode[] = [
      {
        key: 'dir',
        label: '目录',
        children: [
          {
            key: 'users',
            label: '用户',
            to: '/user-service/users',
            permission: [PERMISSION.userRead],
          },
          {
            key: 'logs',
            label: '日志',
            to: '/user-service/logs',
            permission: [PERMISSION.logRead],
          },
        ],
      },
    ]

    expect(firstAccessibleLeaf(tree, hasAnyOf([PERMISSION.logRead]))?.to).toBe('/user-service/logs')
    expect(firstAccessibleLeaf(tree, hasAnyOf([]))).toBeUndefined()
  })
})
