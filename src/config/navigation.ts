import type { ParseKeys } from 'i18next'
import type { LucideIcon } from 'lucide-react'
import { Database, Sparkles, UsersRound } from 'lucide-react'
import type { FileRouteTypes } from '@/routeTree.gen'

/** 应用内可跳转的路由路径（由 TanStack Router 生成的路由树推导） */
export type AppPath = FileRouteTypes['to']

/**
 * 导航节点，支持任意层级嵌套：
 * - 有 `children` 的节点为目录，仅用于分组展开
 * - 有 `to` 的节点为页面（叶子）
 */
export interface NavNode {
  /** 全局唯一键；叶子节点默认使用路径 */
  key: string
  /** 菜单文案的 i18n 键 */
  labelKey: ParseKeys
  /** 图标，建议仅一级节点配置 */
  icon?: LucideIcon
  /** 跳转路径（叶子节点必填） */
  to?: AppPath
  /** 子节点 */
  children?: NavNode[]
}

/** 叶子节点及其祖先链，用于搜索与面包屑 */
export interface NavLeaf {
  node: NavNode & { to: AppPath }
  /** 从一级到当前节点的完整链路（含自身） */
  trail: NavNode[]
}

/**
 * 创建页面节点
 * @param labelKey - 菜单文案 i18n 键
 * @param to - 路由路径
 * @returns 叶子导航节点
 */
const page = (labelKey: ParseKeys, to: AppPath): NavNode => ({ key: to, labelKey, to })

/** 全站导航树 */
export const NAV_TREE: NavNode[] = [
  {
    key: 'data-gen',
    labelKey: 'module.dataGen',
    icon: Sparkles,
    children: [
      {
        key: 'data-gen/prepare',
        labelKey: 'group.prepareScene',
        children: [page('menu.sceneResources', '/data-gen/scene-resources')],
      },
      {
        key: 'data-gen/production',
        labelKey: 'group.production',
        children: [
          page('menu.tasks', '/data-gen/tasks'),
          page('menu.taskTemplates', '/data-gen/task-templates'),
          page('menu.flows', '/data-gen/flows'),
        ],
      },
      {
        key: 'data-gen/monitoring',
        labelKey: 'group.monitoring',
        children: [
          page('menu.schedules', '/data-gen/schedules'),
          page('menu.monitor', '/data-gen/monitor'),
          page('menu.notifications', '/data-gen/notifications'),
        ],
      },
      {
        key: 'data-gen/qc',
        labelKey: 'group.qcArchive',
        children: [
          page('menu.quality', '/data-gen/quality'),
          page('menu.categories', '/data-gen/categories'),
        ],
      },
    ],
  },
  {
    key: 'dataset',
    labelKey: 'module.dataset',
    icon: Database,
    children: [
      page('menu.ingestion', '/dataset/ingestion'),
      page('menu.processing', '/dataset/processing'),
      page('menu.seedData', '/dataset/seed'),
      page('menu.syntheticData', '/dataset/synthetic'),
      page('menu.feedback', '/dataset/feedback'),
    ],
  },
  {
    key: 'user-service',
    labelKey: 'module.userService',
    icon: UsersRound,
    children: [
      page('menu.users', '/user-service/users'),
      page('menu.permissions', '/user-service/permissions'),
      page('menu.portal', '/user-service/portal'),
      page('menu.security', '/user-service/security'),
      page('menu.logs', '/user-service/logs'),
      page('menu.projects', '/user-service/projects'),
      page('menu.messages', '/user-service/messages'),
      page('menu.config', '/user-service/config'),
    ],
  },
]

/**
 * 深度优先展开导航树，收集所有叶子页面及其祖先链
 * @param nodes - 导航节点列表
 * @param parents - 当前祖先链
 * @returns 叶子列表
 */
export const flattenLeaves = (nodes: NavNode[], parents: NavNode[] = []): NavLeaf[] =>
  nodes.flatMap((node) => {
    const trail = [...parents, node]
    if (node.children?.length) return flattenLeaves(node.children, trail)
    return node.to ? [{ node: node as NavLeaf['node'], trail }] : []
  })

/** 全部叶子页面（静态缓存） */
export const NAV_LEAVES = flattenLeaves(NAV_TREE)

/**
 * 根据当前路径找到匹配的叶子页面；子路由（如详情页）匹配其最长前缀页面
 * @param pathname - 当前路由路径
 * @param leaves - 叶子列表，默认全站
 * @returns 匹配的叶子，未匹配时返回 undefined
 */
export const matchLeaf = (pathname: string, leaves: NavLeaf[] = NAV_LEAVES): NavLeaf | undefined =>
  leaves
    .filter(({ node }) => pathname === node.to || pathname.startsWith(`${node.to}/`))
    .sort((a, b) => b.node.to.length - a.node.to.length)[0]
