import { describe, expect, it } from 'vitest'
import type { NavNode } from './navigation'
import { flattenLeaves, matchLeaf, NAV_LEAVES } from './navigation'

describe('navigation', () => {
  it('展开任意层级的叶子并保留祖先链', () => {
    const tree: NavNode[] = [
      {
        key: 'a',
        labelKey: 'module.dataGen',
        children: [
          {
            key: 'b',
            labelKey: 'group.production',
            children: [{ key: 'c', labelKey: 'menu.tasks', to: '/data-gen/tasks' }],
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

  it('叶子路径全局唯一', () => {
    const paths = NAV_LEAVES.map((l) => l.node.to)
    expect(new Set(paths).size).toBe(paths.length)
  })
})
