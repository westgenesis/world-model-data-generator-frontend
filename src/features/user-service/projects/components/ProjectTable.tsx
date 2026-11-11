import { Link } from '@tanstack/react-router'
import type { TablePaginationConfig, TableProps } from 'antd'
import { Button, Table } from 'antd'
import type { ProjectDetail } from '@/api/projects'
import { formatDate, formatNumber } from '@/lib/format'
import { ProjectStatusTag } from './ProjectStatusTag'

interface ProjectTableProps {
  data: ProjectDetail[]
  loading: boolean
  pagination: TablePaginationConfig
  /** 编辑项目 */
  onEdit: (project: ProjectDetail) => void
  /** 归档项目 */
  onArchive: (project: ProjectDetail) => void
  /** 恢复已归档项目 */
  onRestore: (project: ProjectDetail) => void
}

/**
 * 渲染右对齐的数值单元格
 * @param value - 数值
 * @param unit - 单位
 */
const renderNum = (value: number | null, unit = '') => (
  <span className="tabular-nums">
    {formatNumber(value, 1)}
    {value !== null && unit}
  </span>
)

/**
 * 项目列表表格
 * @param props - 数据、分页与行操作回调
 */
export const ProjectTable = ({
  data,
  loading,
  pagination,
  onEdit,
  onArchive,
  onRestore,
}: ProjectTableProps) => {
  const columns: TableProps<ProjectDetail>['columns'] = [
    {
      title: '项目名称 / 标识',
      dataIndex: 'name',
      render: (_, project) => (
        <div className="flex flex-col">
          <Link
            to="/user-service/projects/$projectId"
            params={{ projectId: project.id }}
            className="font-medium text-fg hover:text-primary"
          >
            {project.name}
          </Link>
          <span className="font-mono text-xs text-fg-3">{project.code}</span>
        </div>
      ),
    },
    { title: '负责人', dataIndex: 'ownerName', width: 100 },
    {
      title: '成员数',
      dataIndex: 'memberCount',
      align: 'end',
      render: (v: number) => renderNum(v),
    },
    {
      title: '数据量',
      dataIndex: 'dataSizeTb',
      align: 'end',
      render: (v: number) => renderNum(v, ' TB'),
    },
    {
      title: '任务数',
      dataIndex: 'taskCount',
      align: 'end',
      render: (v: number | null) => renderNum(v),
    },
    {
      title: '场景数',
      dataIndex: 'sceneCount',
      align: 'end',
      render: (v: number | null) => renderNum(v),
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_, project) => <ProjectStatusTag project={project} />,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 120,
      render: (v: string) => <span className="text-fg-2 tabular-nums">{formatDate(v)}</span>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 170,
      fixed: 'end',
      render: (_, project) => {
        const archived = project.status === 'archived'
        return (
          <div className="-ms-2 flex">
            <Link to="/user-service/projects/$projectId" params={{ projectId: project.id }}>
              <Button type="link" size="small">
                详情
              </Button>
            </Link>
            {archived ? (
              <Button type="link" size="small" onClick={() => onRestore(project)}>
                恢复
              </Button>
            ) : (
              <Button type="link" size="small" onClick={() => onEdit(project)}>
                编辑
              </Button>
            )}
            {!archived && !project.isDefault && (
              <Button type="link" size="small" danger onClick={() => onArchive(project)}>
                归档
              </Button>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-card shadow-card">
      <Table<ProjectDetail>
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ ...pagination, className: 'px-4' }}
        scroll={{ x: 1000 }}
      />
    </div>
  )
}
