/**
 * 全局业务枚举：统一维护取值、中文文案与标签色调。
 * 取值为与后端约定的接口值；接口联调时若后端取值不同，只需修改此处。
 */
import type { EnumValue } from '@/lib/enum'
import { defineEnum } from '@/lib/enum'

/* ---------------------------------- 用户 ---------------------------------- */

/** 用户账号状态 */
export const UserStatus = defineEnum([
  { value: 'enabled', label: '启用', tone: 'success' },
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

/** 用户全局角色 */
export const UserRole = defineEnum([
  { value: 'system_admin', label: '系统管理员', tone: 'danger' },
  { value: 'data_admin', label: '数据管理员', tone: 'info' },
  { value: 'algorithm_engineer', label: '算法工程师', tone: 'purple' },
  { value: 'annotator', label: '标注员', tone: 'default' },
  { value: 'guest', label: '访客', tone: 'default' },
])
export type UserRole = EnumValue<typeof UserRole>

/** 可临时授予用户的附加权限 */
export const ExtraPermission = defineEnum([
  { value: 'task:terminate', label: 'task:terminate（临时）' },
  { value: 'system:config', label: 'system:config（临时）' },
  { value: 'data:delete', label: 'data:delete（临时）' },
])
export type ExtraPermission = EnumValue<typeof ExtraPermission>

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
