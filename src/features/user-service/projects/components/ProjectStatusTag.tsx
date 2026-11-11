import { Tag } from 'antd'
import type { ProjectDetail } from '@/api/projects'
import { EnumTag } from '@/components/EnumTag'
import { ProjectStatus } from '@/constants/enums'

/**
 * 项目状态标签：默认项目显示「默认」，其余按项目状态显示
 * @param props.project - 项目
 */
export const ProjectStatusTag = ({
  project,
}: {
  project: Pick<ProjectDetail, 'status' | 'isDefault'>
}) =>
  project.isDefault ? (
    <Tag variant="filled" color="processing" className="me-0">
      默认
    </Tag>
  ) : (
    <EnumTag enumDef={ProjectStatus} value={project.status} />
  )
