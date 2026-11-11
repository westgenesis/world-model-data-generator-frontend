import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { Button, Result, Skeleton, Tabs } from 'antd'
import type { ProjectDetail, ProjectMember } from '@/api/projects'
import { projectDetailQueryOptions, projectMembersQueryOptions } from '@/api/projects'
import { ProjectDetailTab } from '@/constants/enums'
import { useDrawerState } from '@/hooks/use-drawer-state'
import { isHttpStatus } from '@/lib/http'
import { ProjectArchiveDrawer } from './components/ProjectArchiveDrawer'
import { ProjectFormDrawer } from './components/ProjectFormDrawer'
import { ProjectMemberDrawer } from './components/ProjectMemberDrawer'
import { ProjectDetailHeader } from './components/detail/ProjectDetailHeader'
import { ProjectMembersTab } from './components/detail/ProjectMembersTab'
import { ProjectOverviewTab } from './components/detail/ProjectOverviewTab'
import { ProjectResourcesTab } from './components/detail/ProjectResourcesTab'
import { useRestoreProject } from './hooks/use-restore-project'

const routeApi = getRouteApi('/_app/user-service/projects/$projectId')

/** 项目详情页：概览 / 成员 / 资源消耗 */
export const ProjectDetailPage = () => {
  const { projectId } = routeApi.useParams()
  const { tab = 'overview' } = routeApi.useSearch()
  const navigate = routeApi.useNavigate()

  const { data: project, isPending, error } = useQuery(projectDetailQueryOptions(projectId))
  const members = useQuery(projectMembersQueryOptions(projectId))

  const formDrawer = useDrawerState<ProjectDetail>()
  const archiveDrawer = useDrawerState<ProjectDetail>()
  const memberDrawer = useDrawerState<ProjectMember>()
  const restore = useRestoreProject()

  if (isPending) return <Skeleton active paragraph={{ rows: 8 }} />

  if (error || !project) {
    return (
      <Result
        status={isHttpStatus(error, 404) ? '404' : 'error'}
        title={isHttpStatus(error, 404) ? '项目不存在' : '项目加载失败'}
        subTitle={isHttpStatus(error, 404) ? '该项目可能已被删除或链接有误' : '请稍后重试'}
        extra={
          <Link to="/user-service/projects">
            <Button type="primary">返回项目列表</Button>
          </Link>
        }
      />
    )
  }

  const editable = project.status === 'active'
  const tabContent: Record<ProjectDetailTab, React.ReactNode> = {
    overview: <ProjectOverviewTab project={project} />,
    members: (
      <ProjectMembersTab
        projectId={projectId}
        members={members.data ?? []}
        loading={members.isPending}
        editable={editable}
        onAdd={() => memberDrawer.show()}
        onEdit={memberDrawer.show}
      />
    ),
    resources: <ProjectResourcesTab projectId={projectId} />,
  }

  return (
    <>
      <ProjectDetailHeader
        project={project}
        onEdit={() => formDrawer.show(project)}
        onAddMember={() => memberDrawer.show()}
        onArchive={() => archiveDrawer.show(project)}
        onRestore={() => restore(project)}
      />

      <Tabs
        activeKey={tab}
        onChange={(key) => navigate({ search: { tab: key as ProjectDetailTab }, replace: true })}
        items={ProjectDetailTab.items.map(({ value, label }) => ({
          key: value,
          label,
          children: tabContent[value],
        }))}
      />

      <ProjectFormDrawer
        open={formDrawer.open}
        project={formDrawer.record}
        onClose={formDrawer.close}
      />
      <ProjectArchiveDrawer
        open={archiveDrawer.open}
        project={archiveDrawer.record}
        onClose={archiveDrawer.close}
      />
      <ProjectMemberDrawer
        open={memberDrawer.open}
        projectId={projectId}
        member={memberDrawer.record}
        existingMembers={members.data ?? []}
        onClose={memberDrawer.close}
      />
    </>
  )
}
