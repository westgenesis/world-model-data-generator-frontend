import { useQuery } from '@tanstack/react-query'
import { Button } from 'antd'
import {
  Boxes,
  Calendar,
  Clock,
  FolderKanban,
  HardDrive,
  Pencil,
  Power,
  Sprout,
  Tags,
  WandSparkles,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type { Dataset } from '@/api/datasets'
import { projectsQueryOptions } from '@/api/projects'
import { EnumTag } from '@/components/EnumTag'
import { DatasetType, EnabledState } from '@/constants/enums'
import { formatBytes, formatDateTime, formatNumber } from '@/lib/format'

interface DatasetDetailProps {
  dataset: Dataset
  /** 编辑数据集 */
  onEdit: () => void
  /** 切换启用 / 停用 */
  onToggleStatus: () => void
}

/** 类型 → 图标块样式 */
const TYPE_SURFACE: Record<DatasetType, { icon: ReactNode; className: string }> = {
  seed: {
    icon: <Sprout size={20} strokeWidth={1.75} />,
    className: 'bg-primary-soft text-primary',
  },
  synthetic: {
    icon: <WandSparkles size={20} strokeWidth={1.75} />,
    className: 'bg-purple-soft text-purple',
  },
}

/** 元信息项：图标 + 名称 + 值 */
const MetaItem = ({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) => (
  <div className="flex items-center gap-2.5">
    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-fg-2">
      {icon}
    </span>
    <div className="min-w-0">
      <div className="text-xs text-fg-3">{label}</div>
      <div className="truncate text-[13px] font-medium text-fg">{value}</div>
    </div>
  </div>
)

/**
 * 右侧数据集详情卡片
 * @param props - 数据集与操作回调
 */
export const DatasetDetail = ({ dataset, onEdit, onToggleStatus }: DatasetDetailProps) => {
  const { data: projects = [] } = useQuery(projectsQueryOptions)
  const surface = TYPE_SURFACE[dataset.type]
  const projectName = projects.find((project) => project.id === dataset.project_id)?.name

  return (
    <section className="rounded-xl border border-line bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-start gap-4">
        <span
          className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${surface.className}`}
        >
          {surface.icon}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-lg leading-6 font-semibold tracking-tight text-fg">
              {dataset.name}
            </h2>
            <EnumTag enumDef={DatasetType} value={dataset.type} />
            <EnumTag enumDef={EnabledState} value={dataset.state} />
          </div>
          {dataset.description ? (
            <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-fg-2">
              {dataset.description}
            </p>
          ) : (
            <p className="mt-1.5 text-[13px] text-fg-3">暂无描述</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button icon={<Pencil size={15} strokeWidth={1.75} />} onClick={onEdit}>
            编辑
          </Button>
          <Button
            danger={dataset.state === 'enabled'}
            icon={<Power size={15} strokeWidth={1.75} />}
            onClick={onToggleStatus}
          >
            {dataset.state === 'enabled' ? '停用' : '启用'}
          </Button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-5 sm:grid-cols-3">
        <MetaItem
          icon={<Boxes size={15} strokeWidth={1.75} />}
          label="片段数"
          value={formatNumber(dataset.member_count)}
        />
        <MetaItem
          icon={<Tags size={15} strokeWidth={1.75} />}
          label="标签集"
          value={formatNumber(dataset.tag_set_count)}
        />
        <MetaItem
          icon={<HardDrive size={15} strokeWidth={1.75} />}
          label="数据大小"
          value={formatBytes(dataset.size_bytes)}
        />
        <MetaItem
          icon={<FolderKanban size={15} strokeWidth={1.75} />}
          label="所属项目"
          value={projectName ?? `#${dataset.project_id}`}
        />
        <MetaItem
          icon={<Calendar size={15} strokeWidth={1.75} />}
          label="创建时间"
          value={formatDateTime(dataset.created_at)}
        />
        <MetaItem
          icon={<Clock size={15} strokeWidth={1.75} />}
          label="更新时间"
          value={formatDateTime(dataset.updated_at)}
        />
      </div>
    </section>
  )
}
