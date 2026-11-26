import { useQuery } from '@tanstack/react-query'
import { Button, Select } from 'antd'
import { Plus } from 'lucide-react'
import { useMemo } from 'react'
import type { Project } from '@/api/projects'
import { projectListQueryOptions } from '@/api/projects'
import { userOptionsQueryOptions } from '@/api/users'
import { FilterBar, FilterField } from '@/components/FilterBar'
import { PageHeader } from '@/components/PageHeader'
import type { ProjectStatus } from '@/constants/enums'
import { ProjectStatus as ProjectStatusEnum } from '@/constants/enums'
import { useDrawerState } from '@/hooks/use-drawer-state'
import { useListParams } from '@/hooks/use-list-params'
import { ProjectFormDrawer } from './components/ProjectFormDrawer'
import { ProjectTable } from './components/ProjectTable'
import { useArchiveProject } from './hooks/use-archive-project'
import { useDeleteProject } from './hooks/use-delete-project'
import { useRestoreProject } from './hooks/use-restore-project'

/** 项目列表筛选条件 */
interface ProjectFilters {
  status?: ProjectStatus
}

/** 项目管理列表页（接口：/v1/projects） */
export const ProjectListPage = () => {
  const { filters, setFilter, submit, reset, params, getPagination } =
    useListParams<ProjectFilters>({}, { manualSearch: true })
  const { data, isFetching } = useQuery(projectListQueryOptions(params))
  const { data: users = [] } = useQuery(userOptionsQueryOptions)

  /** 负责人 ID → 姓名映射 */
  const ownerNames = useMemo(() => new Map(users.map((u) => [u.id, u.name])), [users])

  const formDrawer = useDrawerState<Project>()
  const remove = useDeleteProject()
  const archive = useArchiveProject()
  const restore = useRestoreProject()

  return (
    <>
      <PageHeader
        title="项目管理"
        description="项目是数据归属的容器与权限作用域；数据生成与数据集管理模块的「所属项目」均引用此处维护的项目。"
        extra={
          <Button
            type="primary"
            icon={<Plus size={16} strokeWidth={1.75} />}
            onClick={() => formDrawer.show()}
          >
            新建项目
          </Button>
        }
      />

      <FilterBar onSearch={submit} onReset={reset}>
        <FilterField label="状态">
          <Select
            className="w-32"
            placeholder="全部"
            allowClear
            value={filters.status}
            onChange={(value) => setFilter('status', value)}
            options={ProjectStatusEnum.options}
          />
        </FilterField>
      </FilterBar>

      <ProjectTable
        data={data?.items ?? []}
        loading={isFetching}
        pagination={getPagination(data?.total)}
        ownerNames={ownerNames}
        onEdit={formDrawer.show}
        onArchive={archive}
        onRestore={restore}
        onDelete={remove}
      />

      <ProjectFormDrawer
        open={formDrawer.open}
        project={formDrawer.record}
        onClose={formDrawer.close}
      />
    </>
  )
}
