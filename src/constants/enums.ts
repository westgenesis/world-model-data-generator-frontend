/**
 * 全局业务枚举：统一维护取值、中文文案与标签色调。
 * 取值为与后端约定的接口值；接口联调时若后端取值不同，只需修改此处。
 */
import type { EnumValue } from '@/lib/enum'
import { defineEnum } from '@/lib/enum'

/* ---------------------------------- 用户 ---------------------------------- */

/** 用户账号状态：待激活 → 启用 ⇄ 停用（对应后端 UserStatus） */
export const UserStatus = defineEnum([
  { value: 'pending', label: '待激活', tone: 'warning' },
  { value: 'active', label: '启用', tone: 'success' },
  { value: 'disabled', label: '停用', tone: 'default' },
])
export type UserStatus = EnumValue<typeof UserStatus>

/** 所属部门（后端提供组织架构接口后可改为动态获取） */
export const Department = defineEnum([
  { value: 'data_platform', label: '数据平台部' },
  { value: 'algorithm', label: '算法研发部' },
  { value: 'data_operation', label: '数据运营部' },
  { value: 'platform_ops', label: '平台运维部' },
])
export type Department = EnumValue<typeof Department>

/** 临时授权状态：未生效 → 生效中 → 已过期 / 已撤销 */
export const UserGrantStatus = defineEnum([
  { value: 'pending', label: '未生效', tone: 'warning' },
  { value: 'active', label: '生效中', tone: 'success' },
  { value: 'expired', label: '已过期', tone: 'default' },
  { value: 'revoked', label: '已撤销', tone: 'danger' },
])
export type UserGrantStatus = EnumValue<typeof UserGrantStatus>

/** 部门状态（接口用 is_active 布尔值，这里用于筛选与标签展示） */
export const DepartmentStatus = defineEnum([
  { value: 'active', label: '启用', tone: 'success' },
  { value: 'inactive', label: '停用', tone: 'default' },
])
export type DepartmentStatus = EnumValue<typeof DepartmentStatus>

/* ---------------------------------- 项目 ---------------------------------- */

/** 项目状态 */
export const ProjectStatus = defineEnum([
  { value: 'active', label: '进行中', tone: 'success' },
  { value: 'archived', label: '已归档', tone: 'default' },
])
export type ProjectStatus = EnumValue<typeof ProjectStatus>

/** 项目列表的状态筛选项：在项目状态基础上增加「默认项目」 */
export const ProjectStatusFilter = defineEnum([
  { value: 'active', label: ProjectStatus.getLabel('active') },
  { value: 'archived', label: ProjectStatus.getLabel('archived') },
  { value: 'default', label: '默认项目' },
])
export type ProjectStatusFilter = EnumValue<typeof ProjectStatusFilter>

/** 项目可见范围 */
export const ProjectVisibility = defineEnum([
  { value: 'members', label: '项目成员可见' },
  { value: 'public', label: '全平台可见（只读）' },
])
export type ProjectVisibility = EnumValue<typeof ProjectVisibility>

/** 项目内角色 */
export const ProjectMemberRole = defineEnum([
  { value: 'owner', label: '项目负责人', tone: 'danger' },
  { value: 'data_admin', label: '数据管理员', tone: 'info' },
  { value: 'algorithm_engineer', label: '算法工程师', tone: 'purple' },
  { value: 'annotator', label: '标注员', tone: 'default' },
  { value: 'guest', label: '访客', tone: 'default' },
])
export type ProjectMemberRole = EnumValue<typeof ProjectMemberRole>

/** 项目成员的数据范围 */
export const DataScope = defineEnum([
  { value: 'all', label: '全部数据' },
  { value: 'seed_and_synthetic', label: '种子数据 + 合成数据' },
  { value: 'synthetic', label: '合成数据' },
  { value: 'qc', label: '质检数据' },
  { value: 'published_dataset', label: '已发布数据集' },
])
export type DataScope = EnumValue<typeof DataScope>

/** 成员有效期到期前提醒 */
export const ExpiryReminder = defineEnum([
  { value: '7d', label: '提前 7 天' },
  { value: '3d', label: '提前 3 天' },
  { value: 'none', label: '不提醒' },
])
export type ExpiryReminder = EnumValue<typeof ExpiryReminder>

/** 项目动态类型，色调决定时间轴圆点颜色 */
export const ProjectActivityType = defineEnum([
  { value: 'dataset_published', label: '数据集发布', tone: 'success' },
  { value: 'task_completed', label: '任务完成', tone: 'info' },
  { value: 'member_joined', label: '成员加入', tone: 'default' },
  { value: 'usage_alert', label: '用量提醒', tone: 'warning' },
])
export type ProjectActivityType = EnumValue<typeof ProjectActivityType>

/** 资源类型 */
export const ResourceType = defineEnum([
  { value: 'storage', label: '存储' },
  { value: 'compute', label: '算力' },
])
export type ResourceType = EnumValue<typeof ResourceType>

/** 用量提醒的处理状态 */
export const AlertStatus = defineEnum([
  { value: 'unread', label: '未读', tone: 'warning' },
  { value: 'read', label: '已读', tone: 'success' },
  { value: 'ignored', label: '已忽略', tone: 'default' },
])
export type AlertStatus = EnumValue<typeof AlertStatus>

/** 项目详情页签（同时作为 URL 查询参数 tab 的取值） */
export const ProjectDetailTab = defineEnum([
  { value: 'overview', label: '概览' },
  { value: 'members', label: '成员' },
  { value: 'resources', label: '资源消耗' },
])
export type ProjectDetailTab = EnumValue<typeof ProjectDetailTab>

/* ---------------------------------- 日志 ---------------------------------- */

/** 日志大类：操作日志 / 业务日志 / 运行异常 */
export const LogCategory = defineEnum([
  { value: 'operation', label: '操作日志', tone: 'info' },
  { value: 'business', label: '业务日志', tone: 'success' },
  { value: 'runtime', label: '运行异常', tone: 'danger' },
])
export type LogCategory = EnumValue<typeof LogCategory>

/** 日志级别 */
export const LogLevel = defineEnum([
  { value: 'DEBUG', label: 'DEBUG' },
  { value: 'INFO', label: 'INFO', tone: 'info' },
  { value: 'WARNING', label: 'WARNING', tone: 'warning' },
  { value: 'ERROR', label: 'ERROR', tone: 'danger' },
  { value: 'CRITICAL', label: 'CRITICAL', tone: 'danger' },
])
export type LogLevel = EnumValue<typeof LogLevel>

/** 日志写入进程：Web 服务 / Celery 任务进程 */
export const LogSource = defineEnum([
  { value: 'api', label: 'Web 服务', tone: 'info' },
  { value: 'worker', label: '任务进程', tone: 'purple' },
])
export type LogSource = EnumValue<typeof LogSource>
