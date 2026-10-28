import type { LocaleResource } from './zh-CN'

/** 英文语言包 */
export const enUS: LocaleResource = {
  app: {
    title: 'World Model Data Generator',
  },
  module: {
    userService: 'User Services',
    dataGen: 'Data Generation',
    dataset: 'Datasets',
  },
  group: {
    prepareScene: 'Scene Preparation',
    production: 'Production',
    monitoring: 'Monitoring',
    qcArchive: 'QC & Archive',
  },
  menu: {
    users: 'Users',
    permissions: 'Permissions',
    portal: 'Portal Settings',
    security: 'Security',
    logs: 'Audit Logs',
    projects: 'Projects',
    messages: 'Messages',
    config: 'Configuration',
    sceneResources: 'Scene Resources',
    tasks: 'Tasks',
    taskTemplates: 'Task Templates',
    flows: 'Flow Plans',
    schedules: 'Scheduling',
    monitor: 'Task Monitor',
    notifications: 'Logs & Alerts',
    quality: 'Quality Check',
    categories: 'Categories',
    ingestion: 'Ingestion',
    processing: 'Processing',
    seedData: 'Seed Data',
    syntheticData: 'Synthetic Data',
    feedback: 'Quality & Feedback',
  },
  topbar: {
    toggleNav: 'Toggle navigation',
    project: {
      hint: 'Lists only show data of the selected project',
      footer: 'Projects are managed in User Services → Projects',
      all: 'All projects',
      allDesc: 'Summary view',
    },
    search: {
      placeholder: 'Search tasks / QC / batches',
    },
    notice: {
      title: 'Notifications',
      viewAll: 'View all',
      empty: 'No notifications',
    },
    cluster: 'Cluster {{status}}',
    clusterOk: 'healthy',
    queue: 'Queue {{count}}',
    language: 'Language',
    logout: 'Sign out',
  },
  sceneEditor: {
    title: 'Scene Editor',
    back: 'Back to scene resources',
  },
  common: {
    placeholder: 'Under construction',
    placeholderDesc: 'This page is not implemented yet. See the prototype in docs/原型.',
    notFound: 'Page not found',
    backHome: 'Back home',
    loading: 'Loading…',
  },
}
