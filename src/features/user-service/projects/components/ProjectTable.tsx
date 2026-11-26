import { Link } from '@tanstack/react-router'
import type { TablePaginationConfig, TableProps } from 'antd'
import { Button, Table, Tag } from 'antd'
import type { Project } from '@/api/projects'
import { EnumTag } from '@/components/EnumTag'
import { ProjectStatus, ProjectVisibility } from '@/constants/enums'
import { EMPTY_TEXT, formatDateTime, formatNumber } from '@/lib/format'

interface ProjectTableProps {
  data: Project[]
  loading: boolean
  pagination: TablePaginationConfig
  /** 负责人 ID → 姓名 */
  ownerNames: Map<string, string>
  /** 编辑项目 */
  onEdit: (project: Project) => void
  /** 归档项目 */
  onArchive: (project: Project) => void
  /** 恢复归档项目 */
  onRestore: (project: Project) => void
  /** 删除项目 */
  onDelete: (project: Project) => void
}

/**
 * 渲染右对齐的数值单元格
 * @param value - 数值
 * @param unit - 单位
 * @param fractionDigits - 最多保留的小数位
 */
const renderNum = (value: number | null, unit = '', fractionDigits = 0) => (
  <span className="tabular-nums">
    {value === null ? EMPTY_TEXT : `${formatNumber(value, fractionDigits)} ${unit}`.trim()}
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
  ownerNames,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
}: ProjectTableProps) => {
  const columns: TableProps<Project>['columns'] = [
    {
      title: '项目名称',
      dataIndex: 'name',
      render: (_, project) => (
        <div className="flex flex-col">
          <Link
            to="/user-service/projects/$projectId"
            params={{ projectId: String(project.id) }}
            className="font-medium text-fg hover:text-primary"
          >
            {project.name}
          </Link>
          {project.description && (
            <span className="max-w-72 truncate text-xs text-fg-3">{project.description}</span>
          )}
        </div>
      ),
    },
    {
      title: '负责人',
      dataIndex: 'owner_id',
      width: 110,
      render: (ownerId: number) =>
        ownerNames.get(String(ownerId)) ?? <span className="text-fg-3">#{ownerId}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: Project['status']) => <EnumTag enumDef={ProjectStatus} value={status} />,
    },
    {
      title: '可见范围',
      dataIndex: 'visibility',
      width: 130,
      render: (visibility: Project['visibility']) => (
        <EnumTag enumDef={ProjectVisibility} value={visibility} />
      ),
    },
    {
      title: '默认项目',
      dataIndex: 'is_default',
      width: 90,
      align: 'center',
      render: (isDefault: boolean) =>
        isDefault ? (
          <Tag variant="filled" color="processing" className="me-0">
            默认
          </Tag>
        ) : (
          EMPTY_TEXT
        ),
    },
    {
      title: '存储参考值',
      dataIndex: 'storage_ref_tb',
      width: 120,
      align: 'end',
      render: (value: number | null) => renderNum(value, 'TB', 1),
    },
    {
      title: '算力参考值',
      dataIndex: 'gpu_ref_hours',
      width: 120,
      align: 'end',
      render: (value: number | null) => renderNum(value, '卡时'),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 130,
      render: (value: string) => (
        <span className="text-fg-2 tabular-nums">{formatDateTime(value)}</span>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 210,
      fixed: 'end',
      render: (_, project) => (
        <div className="-ms-2 flex">
          <Link to="/user-service/projects/$projectId" params={{ projectId: String(project.id) }}>
            <Button type="link" size="small">
              详情
            </Button>
          </Link>
          <Button type="link" size="small" onClick={() => onEdit(project)}>
            编辑
          </Button>
          {project.status === 'archived' ? (
            <Button type="link" size="small" onClick={() => onRestore(project)}>
              恢复
            </Button>
          ) : (
            <Button type="link" size="small" onClick={() => onArchive(project)}>
              归档
            </Button>
          )}
          <Button type="link" size="small" danger onClick={() => onDelete(project)}>
            删除
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-card shadow-card">
      <Table<Project>
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ ...pagination, className: 'px-4' }}
        scroll={{ x: 1080 }}
      />
    </div>
  )
}
