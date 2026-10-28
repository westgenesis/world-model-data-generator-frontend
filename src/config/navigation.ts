import type { ParseKeys } from 'i18next'
import type { FileRouteTypes } from '@/routeTree.gen'

/** 应用内可跳转的路由路径（由 TanStack Router 生成的路由树推导） */
export type AppPath = FileRouteTypes['to']

/** 侧栏菜单项 */
export interface NavItem {
  /** 菜单文案的 i18n 键 */
  labelKey: ParseKeys
  /** 跳转路径 */
  to: AppPath
}

/** 侧栏菜单分组 */
export interface NavGroup {
  /** 分组标题的 i18n 键，不填则不显示分组标题 */
  labelKey?: ParseKeys
  items: NavItem[]
}

/** 顶栏一级模块 */
export interface NavModule {
  key: 'userService' | 'dataGen' | 'dataset'
  labelKey: ParseKeys
  /** 模块路径前缀，用于判断当前所处模块 */
  basePath: string
  /** 点击模块时的默认落地页 */
  defaultTo: AppPath
  groups: NavGroup[]
}

/** 全站导航配置，结构对应 docs/原型 中的顶栏与侧栏 */
export const NAV_MODULES: NavModule[] = [
  {
    key: 'userService',
    labelKey: 'module.userService',
    basePath: '/user-service',
    defaultTo: '/user-service/users',
    groups: [
      {
        items: [
          { labelKey: 'menu.users', to: '/user-service/users' },
          { labelKey: 'menu.permissions', to: '/user-service/permissions' },
          { labelKey: 'menu.portal', to: '/user-service/portal' },
          { labelKey: 'menu.security', to: '/user-service/security' },
          { labelKey: 'menu.logs', to: '/user-service/logs' },
          { labelKey: 'menu.projects', to: '/user-service/projects' },
          { labelKey: 'menu.messages', to: '/user-service/messages' },
          { labelKey: 'menu.config', to: '/user-service/config' },
        ],
      },
    ],
  },
  {
    key: 'dataGen',
    labelKey: 'module.dataGen',
    basePath: '/data-gen',
    defaultTo: '/data-gen/tasks',
    groups: [
      {
        labelKey: 'group.prepareScene',
        items: [{ labelKey: 'menu.sceneResources', to: '/data-gen/scene-resources' }],
      },
      {
        labelKey: 'group.production',
        items: [
          { labelKey: 'menu.tasks', to: '/data-gen/tasks' },
          { labelKey: 'menu.taskTemplates', to: '/data-gen/task-templates' },
          { labelKey: 'menu.flows', to: '/data-gen/flows' },
        ],
      },
      {
        labelKey: 'group.monitoring',
        items: [
          { labelKey: 'menu.schedules', to: '/data-gen/schedules' },
          { labelKey: 'menu.monitor', to: '/data-gen/monitor' },
          { labelKey: 'menu.notifications', to: '/data-gen/notifications' },
        ],
      },
      {
        labelKey: 'group.qcArchive',
        items: [
          { labelKey: 'menu.quality', to: '/data-gen/quality' },
          { labelKey: 'menu.categories', to: '/data-gen/categories' },
        ],
      },
    ],
  },
  {
    key: 'dataset',
    labelKey: 'module.dataset',
    basePath: '/dataset',
    defaultTo: '/dataset/ingestion',
    groups: [
      {
        items: [
          { labelKey: 'menu.ingestion', to: '/dataset/ingestion' },
          { labelKey: 'menu.processing', to: '/dataset/processing' },
          { labelKey: 'menu.seedData', to: '/dataset/seed' },
          { labelKey: 'menu.syntheticData', to: '/dataset/synthetic' },
          { labelKey: 'menu.feedback', to: '/dataset/feedback' },
        ],
      },
    ],
  },
]

/**
 * 根据当前路径查找所属的一级模块
 * @param pathname - 当前路由路径
 * @returns 匹配到的模块，未匹配时返回 undefined
 */
export const findModuleByPath = (pathname: string): NavModule | undefined =>
  NAV_MODULES.find((m) => pathname === m.basePath || pathname.startsWith(`${m.basePath}/`))
