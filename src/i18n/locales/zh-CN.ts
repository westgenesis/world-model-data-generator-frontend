/** 中文语言包（作为类型基准，其他语言包需保持同样的键结构） */
export const zhCN = {
  app: {
    title: '世界模型数据生成系统',
  },
  module: {
    userService: '用户服务管理',
    dataGen: '数据生成',
    dataset: '数据集管理',
  },
  group: {
    prepareScene: '准备场景',
    production: '生产编排',
    monitoring: '执行监控',
    qcArchive: '质检归档',
  },
  menu: {
    users: '用户管理',
    permissions: '权限管理',
    portal: '门户个性化',
    security: '安全管理',
    logs: '日志管理',
    projects: '项目管理',
    messages: '消息中心',
    config: '统一配置管理',
    sceneResources: '场景资源',
    tasks: '任务管理',
    taskTemplates: '任务模板',
    flows: '流程编排方案',
    schedules: '调度策略',
    monitor: '任务监控',
    notifications: '日志与通知',
    quality: '数据质量检验',
    categories: '数据分类管理',
    ingestion: '数据接入',
    processing: '数据处理',
    seedData: '种子数据',
    syntheticData: '合成数据',
    feedback: '质量与反馈',
  },
  topbar: {
    toggleNav: '收起 / 展开导航',
    project: {
      hint: '切换项目后，各列表只显示该项目的数据',
      footer: '项目由「用户服务管理 → 项目管理」维护',
      all: '全部项目',
      allDesc: '汇总视图',
    },
    search: {
      placeholder: '搜索任务 / 质检 / 批次',
    },
    notice: {
      title: '消息',
      viewAll: '查看全部消息',
      empty: '暂无消息',
    },
    cluster: '算力集群 {{status}}',
    clusterOk: '正常',
    queue: '队列 {{count}}',
    language: '语言',
    logout: '退出登录',
  },
  sceneEditor: {
    title: '场景编辑器',
    back: '返回场景资源',
  },
  common: {
    placeholder: '页面开发中',
    placeholderDesc: '该页面尚未实现，可参考 docs/原型 中对应的原型文件。',
    notFound: '页面不存在',
    backHome: '返回首页',
    loading: '加载中…',
  },
}

/** 语言包结构类型 */
export type LocaleResource = typeof zhCN
