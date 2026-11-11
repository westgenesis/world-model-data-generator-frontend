/**
 * 用户服务管理模块的内存 Mock 数据（数据取自原型），刷新页面后重置。
 * 用户与项目相互引用（负责人、成员），因此集中放在同一文件维护。
 */
import type {
  ProjectDetail,
  ProjectMember,
  ProjectOverview,
  ProjectResources,
} from '@/api/projects'
import type { User } from '@/api/users'
import type { Department, UserRole } from '@/constants/enums'
import { isoDate, minutesAgo } from '../utils'

/** 用户种子：[姓名, 账号, 部门, 角色, 是否停用] */
const USER_SEEDS: [string, string, Department, UserRole, boolean?][] = [
  ['李工', 'li.gong', 'data_platform', 'system_admin'],
  ['王工', 'wang.gong', 'algorithm', 'data_admin'],
  ['陈工', 'chen.gong', 'algorithm', 'algorithm_engineer'],
  ['刘工', 'liu.gong', 'data_operation', 'annotator'],
  ['张工', 'zhang.gong', 'platform_ops', 'guest'],
  ['赵工', 'zhao.gong', 'algorithm', 'algorithm_engineer'],
  ['钱工', 'qian.gong', 'data_operation', 'annotator'],
  ['孙工', 'sun.gong', 'data_platform', 'data_admin'],
  ['周工', 'zhou.gong', 'algorithm', 'algorithm_engineer', true],
  ['吴工', 'wu.gong', 'data_operation', 'annotator'],
  ['郑工', 'zheng.gong', 'platform_ops', 'guest', true],
  ['冯工', 'feng.gong', 'data_platform', 'data_admin'],
]

/** 内存中的用户数据 */
export const users: User[] = Array.from({ length: 36 }, (_, i) => {
  const [baseName, baseAccount, department, role, disabled] = USER_SEEDS[i % USER_SEEDS.length]
  const round = Math.floor(i / USER_SEEDS.length)
  const suffix = round ? String(round + 1) : ''
  return {
    id: `U-${String(i + 1).padStart(4, '0')}`,
    name: `${baseName}${suffix}`,
    account: `${baseAccount}${suffix}`,
    phone: `138${String(10000000 + i * 7919).slice(0, 8)}`,
    email: `${baseAccount}${suffix}@company.com`,
    department,
    role,
    status: disabled || i % 7 === 6 ? 'disabled' : 'enabled',
    lastLoginAt: i % 9 === 8 ? null : minutesAgo(30 + i * 97),
    createdAt: minutesAgo(60 * 24 * (i < 3 ? 5 + i : 40 + i * 3)),
  }
})

/** 项目种子：[名称, 负责人账号, 成员数, 数据量 TB, 任务数, 场景数, 状态, 创建日期] */
const PROJECT_SEEDS: [
  string,
  string,
  number,
  number,
  number,
  number,
  'active' | 'archived',
  string,
][] = [
  ['雨天场景数据生产', 'li.gong', 14, 18.2, 36, 128, 'active', '2026-03-12'],
  ['夜间长尾数据采集', 'wang.gong', 9, 15.6, 24, 96, 'active', '2026-04-02'],
  ['施工占道场景集', 'chen.gong', 7, 14.1, 18, 74, 'active', '2026-05-18'],
  ['高速匝道评测集', 'zhang.gong', 5, 8.4, 12, 42, 'active', '2026-06-06'],
  ['环岛场景预研', 'liu.gong', 3, 2.1, 4, 16, 'archived', '2026-01-20'],
  ['城市路口博弈场景', 'wang.gong', 6, 3.8, 9, 37, 'active', '2026-07-02'],
  ['隧道光照突变', 'chen.gong', 4, 2.6, 6, 21, 'active', '2026-07-21'],
  ['园区低速物流', 'li.gong', 3, 1.4, 3, 12, 'archived', '2026-02-08'],
  ['极端天气补充集', 'zhang.gong', 5, 3.9, 8, 30, 'active', '2026-08-15'],
  ['行人横穿长尾集', 'liu.gong', 2, 0.9, 2, 9, 'archived', '2026-02-26'],
  ['泊车场景数据', 'chen.gong', 4, 1.6, 4, 15, 'active', '2026-09-01'],
]

/**
 * 根据账号查找用户
 * @param account - 登录账号
 * @returns 用户
 */
const userByAccount = (account: string): User => users.find((u) => u.account === account)!

/** 内存中的项目数据 */
export const projects: ProjectDetail[] = [
  {
    id: 'PRJ-0000',
    code: 'PRJ-0000',
    name: '默认项目',
    ownerId: null,
    ownerName: '系统',
    departments: [],
    description: '未指定归属的数据自动归入本项目',
    visibility: 'public',
    storageQuotaTb: 2,
    computeQuotaHours: 200,
    isDefault: true,
    status: 'active',
    memberCount: users.length,
    dataSizeTb: 0.4,
    taskCount: null,
    sceneCount: null,
    createdAt: isoDate('2026-01-01'),
  },
  ...PROJECT_SEEDS.map(
    ([name, ownerAccount, memberCount, dataSizeTb, taskCount, sceneCount, status, date], i) => {
      const owner = userByAccount(ownerAccount)
      const code = `PRJ-${String(i + 1).padStart(4, '0')}`
      return {
        id: code,
        code,
        name,
        ownerId: owner.id,
        ownerName: owner.name,
        departments: [owner.department],
        description: `${name}相关的数据生产与管理`,
        visibility: 'members' as const,
        storageQuotaTb: 30,
        computeQuotaHours: 2000,
        isDefault: false,
        status,
        memberCount,
        dataSizeTb,
        taskCount,
        sceneCount,
        createdAt: isoDate(date),
      }
    },
  ),
]

/** 项目成员（按项目 ID 存储；未初始化的项目在首次访问时生成） */
export const projectMembers = new Map<string, ProjectMember[]>()

/** 成员角色与数据范围的默认组合，取自原型 */
const MEMBER_PRESETS: Pick<ProjectMember, 'role' | 'dataScope'>[] = [
  { role: 'data_admin', dataScope: 'seed_and_synthetic' },
  { role: 'algorithm_engineer', dataScope: 'synthetic' },
  { role: 'annotator', dataScope: 'qc' },
  { role: 'guest', dataScope: 'published_dataset' },
]

/**
 * 获取项目成员，首次访问时按项目负责人与前几位用户生成
 * @param project - 项目
 * @returns 成员列表（可直接修改）
 */
export const getProjectMembers = (project: ProjectDetail): ProjectMember[] => {
  let members = projectMembers.get(project.id)
  if (!members) {
    const owner = users.find((u) => u.id === project.ownerId)
    const others = users
      .filter((u) => u.id !== project.ownerId)
      .slice(0, Math.max(0, Math.min(project.memberCount, 8) - 1))
    members = [
      ...(owner ? [{ user: owner, role: 'owner' as const, dataScope: 'all' as const }] : []),
      ...others.map((user, i) => ({ user, ...MEMBER_PRESETS[i % MEMBER_PRESETS.length] })),
    ].map(({ user, role, dataScope }, i) => ({
      userId: user.id,
      name: user.name,
      account: user.account,
      role,
      dataScope,
      expireAt: null,
      reminder: '7d',
      remark: '',
      joinedAt: new Date(new Date(project.createdAt).getTime() + i * 86_400_000 * 9).toISOString(),
      lastActiveAt: user.lastLoginAt,
    }))
    projectMembers.set(project.id, members)
  }
  return members
}

/**
 * 生成项目概览数据（按项目数据量等比缩放原型数据）
 * @param project - 项目
 * @returns 概览
 */
export const buildProjectOverview = (project: ProjectDetail): ProjectOverview => {
  const scale = project.dataSizeTb / 18.2
  const months: [string, number, number, number | null][] = [
    ['2026-09', 3.4, 1842, 0.18],
    ['2026-08', 2.9, 1560, 0.09],
    ['2026-07', 2.6, 1428, -0.04],
    ['2026-06', 2.7, 1486, 0.22],
    ['2026-05', 2.2, 1214, 0.31],
    ['2026-04', 1.7, 928, null],
  ]
  return {
    datasetCount: Math.max(1, Math.round(6 * scale)),
    clipCount: Math.round(8642 * scale),
    growth: months.map(([month, sizeTb, count, ratio]) => ({
      month,
      sizeTb: Number((sizeTb * scale).toFixed(1)),
      count: Math.round(count * scale),
      ratio,
    })),
    activities: [
      {
        id: 'A-1',
        type: 'dataset_published',
        title: `数据集「${project.name} v3」发布`,
        description: `864 条 · ${project.ownerName}`,
        time: minutesAgo(60 * 3),
      },
      {
        id: 'A-2',
        type: 'task_completed',
        title: '生成任务 T-20260913-07 完成',
        description: '产出 320 条 · 合格 318 条',
        time: minutesAgo(60 * 16),
      },
      {
        id: 'A-3',
        type: 'member_joined',
        title: '陈工加入项目',
        description: `项目内角色 算法工程师 · ${project.ownerName}邀请`,
        time: minutesAgo(60 * 50),
      },
      {
        id: 'A-4',
        type: 'usage_alert',
        title: '存储已用量达到参考值 80%',
        description: '已提醒项目负责人与系统管理员',
        time: minutesAgo(60 * 49),
      },
    ],
  }
}

/**
 * 生成项目资源消耗数据
 * @param project - 项目
 * @returns 资源消耗
 */
export const buildProjectResources = (project: ProjectDetail): ProjectResources => {
  const used = project.dataSizeTb
  const usedHours = Math.round((project.taskCount ?? 1) * 35.7)
  return {
    storage: {
      usedTb: used,
      quotaTb: project.storageQuotaTb,
      breakdown: [
        { label: '视频', valueTb: Number((used * 0.68).toFixed(1)) },
        { label: '点云', valueTb: Number((used * 0.23).toFixed(1)) },
        { label: '真值标签', valueTb: Number((used * 0.09).toFixed(1)) },
      ],
    },
    compute: {
      usedHours,
      quotaHours: project.computeQuotaHours,
      monthHours: Math.round(usedHours * 0.38),
      taskCount: project.taskCount ?? 0,
      avgHoursPerTask: 35.7,
    },
    alerts: [
      {
        id: 'AL-1',
        time: minutesAgo(60 * 49),
        type: 'storage',
        content: `已用量达到参考值 80%（${(project.storageQuotaTb * 0.8).toFixed(1)} TB）`,
        targets: '项目负责人 · 系统管理员',
        status: 'read',
      },
      {
        id: 'AL-2',
        time: minutesAgo(60 * 24 * 6),
        type: 'compute',
        content: '本月生成算力已达参考值 65%',
        targets: '项目负责人',
        status: 'read',
      },
      {
        id: 'AL-3',
        time: minutesAgo(60 * 24 * 19),
        type: 'storage',
        content: '连续 7 日无新增数据，可考虑归档',
        targets: '项目负责人',
        status: 'ignored',
      },
    ],
  }
}
