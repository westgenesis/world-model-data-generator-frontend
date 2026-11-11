import { useQuery } from '@tanstack/react-query'
import { Alert, Button, Input, Select } from 'antd'
import { Plus } from 'lucide-react'
import type { ProjectDetail } from '@/api/projects'
import { projectListQueryOptions } from '@/api/projects'
import { userOptionsQueryOptions } from '@/api/users'
import { FilterBar, FilterField } from '@/components/FilterBar'
import { PageHeader } from '@/components/PageHeader'
import { ProjectStatusFilter } from '@/constants/enums'
import { useDrawerState } from '@/hooks/use-drawer-state'
import { useListParams } from '@/hooks/use-list-params'
import { ProjectArchiveDrawer } from './components/ProjectArchiveDrawer'
import { ProjectFormDrawer } from './components/ProjectFormDrawer'
import { ProjectStats } from './components/ProjectStats'
import { ProjectTable } from './components/ProjectTable'
import { useRestoreProject } from './hooks/use-restore-project'

/** 项目列表筛选条件 */
interface ProjectFilters {
  status?: ProjectStatusFilter
  ownerId?: string
  keyword: string
}

/** 项目管理列表页（参考 docs/原型/M1用户服务管理_原型.html） */
export const ProjectListPage = () => {
  const { filters, setFilter, reset, params, getPagination } = useListParams<ProjectFilters>({
    keyword: '',
  })
  const { data, isFetching } = useQuery(projectListQueryOptions(params))
  const { data: users = [] } = useQuery(userOptionsQueryOptions)

  const formDrawer = useDrawerState<ProjectDetail>()
  const archiveDrawer = useDrawerState<ProjectDetail>()
  const restore = useRestoreProject()

  return (
    <>
      <PageHeader
        title="项目管理"
        description="项目是数据的归属容器与权限作用域，单层不嵌套。数据生成与数据集管理模块的「所属项目」均引用此处维护的项目，不在各自模块内新建。"
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

      <Alert
        className="mb-4"
        type="info"
        showIcon
        title="资源消耗按项目统计，在「项目详情 · 资源消耗」中查看：只记录已用量并与参考值比对提醒，不拦截、不扣减、不限制任何操作。"
      />

      <ProjectStats />

      <FilterBar onReset={reset}>
        <FilterField label="状态">
          <Select
            className="w-32"
            placeholder="全部"
            allowClear
            value={filters.status}
            onChange={(value) => setFilter('status', value)}
            options={ProjectStatusFilter.options}
          />
        </FilterField>
        <FilterField label="负责人">
          <Select
            className="w-36"
            placeholder="全部"
            allowClear
            showSearch={{ optionFilterProp: 'label' }}
            value={filters.ownerId}
            onChange={(value) => setFilter('ownerId', value)}
            options={users.map((u) => ({ value: u.id, label: u.name }))}
          />
        </FilterField>
        <FilterField label="关键词">
          <Input
            className="w-56"
            placeholder="项目名称 / 标识"
            allowClear
            value={filters.keyword}
            onChange={(e) => setFilter('keyword', e.target.value)}
          />
        </FilterField>
      </FilterBar>

      <ProjectTable
        data={data?.list ?? []}
        loading={isFetching}
        pagination={getPagination(data?.total)}
        onEdit={formDrawer.show}
        onArchive={archiveDrawer.show}
        onRestore={restore}
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
    </>
  )
}
