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
  /** 菜单文案 */
  label: string
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
 * @param label - 菜单文案
 * @param to - 路由路径
 * @returns 叶子导航节点
 */
const page = (label: string, to: AppPath): NavNode => ({ key: to, label, to })

/** 全站导航树 */
export const NAV_TREE: NavNode[] = [
  {
    key: 'data-gen',
    label: '数据生成',
    icon: Sparkles,
    children: [
      {
        key: 'data-gen/prepare',
        label: '准备场景',
        children: [page('场景资源', '/data-gen/scene-resources')],
      },
      {
        key: 'data-gen/production',
        label: '生产编排',
        children: [
          page('任务管理', '/data-gen/tasks'),
          page('任务模板', '/data-gen/task-templates'),
          page('流程编排方案', '/data-gen/flows'),
        ],
      },
      {
        key: 'data-gen/monitoring',
        label: '执行监控',
        children: [
          page('调度策略', '/data-gen/schedules'),
          page('任务监控', '/data-gen/monitor'),
          page('日志与通知', '/data-gen/notifications'),
        ],
      },
      {
        key: 'data-gen/qc',
        label: '质检归档',
        children: [
          page('数据质量检验', '/data-gen/quality'),
          page('数据分类管理', '/data-gen/categories'),
        ],
      },
    ],
  },
  {
    key: 'dataset',
    label: '数据集管理',
    icon: Database,
    children: [
      page('数据接入', '/dataset/ingestion'),
      page('数据处理', '/dataset/processing'),
      page('种子数据', '/dataset/seed'),
      page('合成数据', '/dataset/synthetic'),
      page('质量与反馈', '/dataset/feedback'),
    ],
  },
  {
    key: 'user-service',
    label: '用户服务管理',
    icon: UsersRound,
    children: [
      page('用户管理', '/user-service/users'),
      page('权限管理', '/user-service/permissions'),
      page('门户个性化', '/user-service/portal'),
      page('安全管理', '/user-service/security'),
      page('日志管理', '/user-service/logs'),
      page('项目管理', '/user-service/projects'),
      page('消息中心', '/user-service/messages'),
      page('统一配置管理', '/user-service/config'),
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
