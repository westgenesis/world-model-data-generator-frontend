import { Link } from '@tanstack/react-router'
import { Button } from 'antd'
import { ArrowLeft, Plus } from 'lucide-react'
import type { ProjectDetail } from '@/api/projects'
import { formatDate } from '@/lib/format'
import { ProjectStatusTag } from '../ProjectStatusTag'

interface ProjectDetailHeaderProps {
  project: ProjectDetail
  onEdit: () => void
  onAddMember: () => void
  onArchive: () => void
  onRestore: () => void
}

/**
 * 项目详情页头：名称、状态、基础信息与操作
 * @param props - 项目与操作回调
 */
export const ProjectDetailHeader = ({
  project,
  onEdit,
  onAddMember,
  onArchive,
  onRestore,
}: ProjectDetailHeaderProps) => {
  const archived = project.status === 'archived'
  const meta = [
    project.code,
    `负责人 ${project.ownerName}`,
    `创建于 ${formatDate(project.createdAt)}`,
    `成员 ${project.memberCount}`,
  ]

  return (
    <div className="mb-4 flex flex-wrap items-end gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <h1 className="truncate text-xl leading-8 font-semibold tracking-tight text-fg">
            {project.name}
          </h1>
          <ProjectStatusTag project={project} />
        </div>
        <p className="mt-1 text-[13px] text-fg-3">{meta.join(' · ')}</p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Link to="/user-service/projects">
          <Button icon={<ArrowLeft size={16} strokeWidth={1.75} />}>返回列表</Button>
        </Link>
        {archived ? (
          <Button type="primary" onClick={onRestore}>
            恢复项目
          </Button>
        ) : (
          <>
            {!project.isDefault && (
              <Button danger onClick={onArchive}>
                归档
              </Button>
            )}
            <Button onClick={onEdit}>编辑项目</Button>
            <Button
              type="primary"
              icon={<Plus size={16} strokeWidth={1.75} />}
              onClick={onAddMember}
            >
              添加成员
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
