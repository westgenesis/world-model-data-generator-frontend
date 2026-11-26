import { Tag } from 'antd'
import type { Project } from '@/api/projects'
import { EnumTag } from '@/components/EnumTag'
import { ProjectStatus } from '@/constants/enums'

/**
 * 项目状态标签：状态 + 默认项目标识
 * @param props.project - 项目
 */
export const ProjectStatusTag = ({
  project,
}: {
  project: Pick<Project, 'status' | 'is_default'>
}) => (
  <div className="flex items-center gap-1.5">
    <EnumTag enumDef={ProjectStatus} value={project.status} />
    {project.is_default && (
      <Tag variant="filled" color="processing" className="me-0">
        默认
      </Tag>
    )}
  </div>
)
