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

/** 项目状态（对应后端 ProjectStatus） */
export const ProjectStatus = defineEnum([
  { value: 'draft', label: '默认', tone: 'warning' },
  { value: 'active', label: '进行中', tone: 'success' },
  { value: 'archived', label: '已归档', tone: 'default' },
])
export type ProjectStatus = EnumValue<typeof ProjectStatus>

/** 项目可见范围（对应后端 ProjectVisibility） */
export const ProjectVisibility = defineEnum([
  { value: 'member', label: '成员可见', tone: 'info' },
  { value: 'platform_readonly', label: '全平台只读', tone: 'default' },
])
export type ProjectVisibility = EnumValue<typeof ProjectVisibility>

/* ---------------------------------- 日志 ---------------------------------- */

/** 日志写入进程：Web 服务 / Celery 任务进程 */
export const LogSource = defineEnum([
  { value: 'api', label: 'Web 服务', tone: 'info' },
  { value: 'worker', label: '任务进程', tone: 'purple' },
])
export type LogSource = EnumValue<typeof LogSource>

/* -------------------------------- 安全审计 -------------------------------- */

/** 安全审计风险等级 */
export const AuditRiskLevel = defineEnum([
  { value: 'high', label: '高', tone: 'danger' },
  { value: 'medium', label: '中', tone: 'warning' },
  { value: 'low', label: '低', tone: 'info' },
])
export type AuditRiskLevel = EnumValue<typeof AuditRiskLevel>

/* -------------------------------- 数据分类 -------------------------------- */

/** 数据集类型：分类体系顶层固定两支（对应后端 DataType） */
export const DatasetType = defineEnum([
  { value: 'seed', label: '种子数据集', tone: 'info' },
  { value: 'synthetic', label: '合成数据集', tone: 'purple' },
])
export type DatasetType = EnumValue<typeof DatasetType>

/** 数据集 / 标签集启用状态（对应后端 EnabledState） */
export const EnabledState = defineEnum([
  { value: 'enabled', label: '启用', tone: 'success' },
  { value: 'disabled', label: '停用', tone: 'default' },
])
export type EnabledState = EnumValue<typeof EnabledState>

/** 标签集类型（对应后端 TagSetType） */
export const TagSetType = defineEnum([
  { value: 'enum_type', label: '枚举型', tone: 'info' },
  { value: 'numeric_type', label: '数值型', tone: 'warning' },
])
export type TagSetType = EnumValue<typeof TagSetType>

/** 打标来源（对应后端 TagSource） */
export const TagSource = defineEnum([
  { value: 'auto_rule', label: '自动规则', tone: 'info' },
  { value: 'manual', label: '手动标注', tone: 'warning' },
  { value: 'ingest', label: '数据接入', tone: 'purple' },
])
export type TagSource = EnumValue<typeof TagSource>
