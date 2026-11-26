import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { Button, Result, Skeleton } from 'antd'
import { ArrowLeft, Calendar, Clock, Cpu, Eye, HardDrive, Pencil, Trash2, User } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import type { Project } from '@/api/projects'
import { projectDetailQueryOptions } from '@/api/projects'
import { userOptionsQueryOptions } from '@/api/users'
import { EnumTag } from '@/components/EnumTag'
import { ProjectVisibility } from '@/constants/enums'
import { useDrawerState } from '@/hooks/use-drawer-state'
import { isHttpStatus } from '@/lib/http'
import { EMPTY_TEXT, formatDate, formatNumber } from '@/lib/format'
import { ProjectFormDrawer } from './components/ProjectFormDrawer'
import { ProjectStatusTag } from './components/ProjectStatusTag'
import { useArchiveProject } from './hooks/use-archive-project'
import { useDeleteProject } from './hooks/use-delete-project'
import { useRestoreProject } from './hooks/use-restore-project'

const routeApi = getRouteApi('/_app/user-service/projects/$projectId')

interface QuotaTileProps {
  /** 指标图标 */
  icon: ReactNode
  /** 指标名称 */
  label: string
  /** 指标值（null 显示占位符） */
  value: number | null
  /** 数值单位 */
  unit: string
  /** 数值最多保留的小数位，默认 0 */
  fractionDigits?: number
}

/**
 * 配额指标卡片：图标 + 名称 + 数值，中性底纹
 * @param props - 图标、名称、数值、单位与小数位
 */
const QuotaTile = ({ icon, label, value, unit, fractionDigits = 0 }: QuotaTileProps) => (
  <div className="flex items-center gap-4 rounded-xl bg-sunken px-5 py-4">
    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-card text-fg-2">
      {icon}
    </span>
    <div className="min-w-0">
      <div className="text-[13px] text-fg-3">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-2xl leading-7 font-semibold tracking-tight text-fg tabular-nums">
          {value === null ? EMPTY_TEXT : formatNumber(value, fractionDigits)}
        </span>
        {value !== null && <span className="text-[13px] text-fg-3">{unit}</span>}
      </div>
    </div>
  </div>
)

/** 项目详情页（接口：GET /v1/projects/{id}） */
export const ProjectDetailPage = () => {
  const { projectId } = routeApi.useParams()
  const id = Number(projectId)
  const validId = Number.isInteger(id) && id > 0

  const {
    data: project,
    isPending,
    error,
  } = useQuery({
    ...projectDetailQueryOptions(id),
    enabled: validId,
  })
  const { data: users = [] } = useQuery(userOptionsQueryOptions)

  /** 负责人姓名；未在候选列表时回退显示用户 ID */
  const ownerName = useMemo(
    () => (project ? users.find((u) => u.id === String(project.owner_id))?.name : undefined),
    [project, users],
  )

  const formDrawer = useDrawerState<Project>()
  const remove = useDeleteProject()
  const archive = useArchiveProject()
  const restore = useRestoreProject()

  if (!validId || (error && isHttpStatus(error, 404))) {
    return (
      <Result
        status="404"
        title="项目不存在"
        subTitle="该项目可能已被删除或链接有误"
        extra={
          <Link to="/user-service/projects">
            <Button type="primary">返回项目列表</Button>
          </Link>
        }
      />
    )
  }

  if (isPending) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-5">
          <Skeleton.Button active size="small" shape="round" className="!w-20" />
        </div>
        <div className="rounded-2xl border border-line bg-card p-6 shadow-card">
          <Skeleton active avatar={{ shape: 'square', size: 48 }} paragraph={{ rows: 4 }} />
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <Result
        status="error"
        title="项目加载失败"
        subTitle="请稍后重试"
        extra={
          <Link to="/user-service/projects">
            <Button type="primary">返回项目列表</Button>
          </Link>
        }
      />
    )
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-5">
        <Link to="/user-service/projects">
          <Button
            type="text"
            size="small"
            icon={<ArrowLeft size={15} strokeWidth={2} />}
            className="-ms-1.5"
          >
            返回列表
          </Button>
        </Link>
      </div>

      {/* 项目概要：名称、元信息、描述与配额指标合并为单卡片 */}
      <section className="animate-fade-up rounded-2xl border border-line bg-card p-6 shadow-card motion-reduce:animate-none">
        <div className="flex flex-wrap items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-sunken text-lg font-semibold text-fg-2">
            {project.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="truncate text-xl leading-7 font-semibold tracking-tight text-fg">
                {project.name}
              </h1>
              <ProjectStatusTag project={project} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-fg-3">
              <span className="inline-flex items-center gap-1.5">
                <User size={13} strokeWidth={2} aria-hidden />
                {ownerName ?? `#${project.owner_id}`}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Eye size={13} strokeWidth={2} aria-hidden />
                <EnumTag enumDef={ProjectVisibility} value={project.visibility} />
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar size={13} strokeWidth={2} aria-hidden />
                创建于 {formatDate(project.created_at)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock size={13} strokeWidth={2} aria-hidden />
                更新于 {formatDate(project.updated_at)}
              </span>
            </div>
          </div>

          <div className="ms-auto flex shrink-0 items-center gap-2">
            <Button
              icon={<Pencil size={15} strokeWidth={1.75} />}
              onClick={() => formDrawer.show(project)}
            >
              编辑
            </Button>
            {project.status === 'archived' ? (
              <Button onClick={() => restore(project)}>恢复</Button>
            ) : (
              <Button onClick={() => archive(project)}>归档</Button>
            )}
            <Button
              danger
              icon={<Trash2 size={15} strokeWidth={1.75} />}
              onClick={() => remove(project)}
            >
              删除
            </Button>
          </div>
        </div>

        {project.description && (
          <div className="mt-5 border-t border-line pt-4">
            <h3 className="text-[13px] font-medium text-fg-3">项目描述</h3>
            <p className="mt-1.5 leading-relaxed break-words whitespace-pre-wrap text-fg-2">
              {project.description}
            </p>
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 gap-3 border-t border-line pt-5 sm:grid-cols-2">
          <QuotaTile
            icon={<HardDrive size={18} strokeWidth={1.75} />}
            label="存储参考值"
            value={project.storage_ref_tb}
            unit="TB"
            fractionDigits={1}
          />
          <QuotaTile
            icon={<Cpu size={18} strokeWidth={1.75} />}
            label="算力参考值"
            value={project.gpu_ref_hours}
            unit="卡时"
          />
        </div>
      </section>

      <ProjectFormDrawer
        open={formDrawer.open}
        project={formDrawer.record}
        onClose={formDrawer.close}
      />
    </div>
  )
}
