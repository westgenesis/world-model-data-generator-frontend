import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  Archive,
  BadgeCheck,
  BellRing,
  Boxes,
  CalendarClock,
  Clapperboard,
  Database,
  DatabaseZap,
  Factory,
  FolderInput,
  FolderKanban,
  KeyRound,
  LayoutTemplate,
  ListTodo,
  Mail,
  MessageSquareWarning,
  Palette,
  Radar,
  ScrollText,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sprout,
  Tags,
  UserCog,
  UsersRound,
  WandSparkles,
  Workflow,
} from 'lucide-react'
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
  /** 图标，各层级均可配置；一级节点用于收起态展示，必须配置 */
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
 * @param icon - 菜单图标
 * @returns 叶子导航节点
 */
const page = (label: string, to: AppPath, icon?: LucideIcon): NavNode => ({
  key: to,
  label,
  to,
  icon,
})

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
        icon: Clapperboard,
        children: [page('场景资源', '/data-gen/scene-resources', Boxes)],
      },
      {
        key: 'data-gen/production',
        label: '生产编排',
        icon: Factory,
        children: [
          page('任务管理', '/data-gen/tasks', ListTodo),
          page('任务模板', '/data-gen/task-templates', LayoutTemplate),
          page('流程编排方案', '/data-gen/flows', Workflow),
        ],
      },
      {
        key: 'data-gen/monitoring',
        label: '执行监控',
        icon: Radar,
        children: [
          page('调度策略', '/data-gen/schedules', CalendarClock),
          page('任务监控', '/data-gen/monitor', Activity),
          page('日志与通知', '/data-gen/notifications', BellRing),
        ],
      },
      {
        key: 'data-gen/qc',
        label: '质检归档',
        icon: Archive,
        children: [
          page('数据质量检验', '/data-gen/quality', BadgeCheck),
          page('数据分类管理', '/data-gen/categories', Tags),
        ],
      },
    ],
  },
  {
    key: 'dataset',
    label: '数据集管理',
    icon: Database,
    children: [
      page('数据接入', '/dataset/ingestion', FolderInput),
      page('数据处理', '/dataset/processing', DatabaseZap),
      page('种子数据', '/dataset/seed', Sprout),
      page('合成数据', '/dataset/synthetic', WandSparkles),
      page('质量与反馈', '/dataset/feedback', MessageSquareWarning),
    ],
  },
  {
    key: 'user-service',
    label: '用户服务管理',
    icon: UsersRound,
    children: [
      page('用户管理', '/user-service/users', UserCog),
      page('权限管理', '/user-service/permissions', KeyRound),
      page('门户个性化', '/user-service/portal', Palette),
      page('安全管理', '/user-service/security', ShieldCheck),
      page('日志管理', '/user-service/logs', ScrollText),
      page('项目管理', '/user-service/projects', FolderKanban),
      page('消息中心', '/user-service/messages', Mail),
      page('统一配置管理', '/user-service/config', SlidersHorizontal),
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
