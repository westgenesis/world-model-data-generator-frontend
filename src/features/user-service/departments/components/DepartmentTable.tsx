import type { TableProps } from 'antd'
import { Button, Table } from 'antd'
import type { Department } from '@/api/departments'
import { EnumTag } from '@/components/EnumTag'
import { DepartmentStatus } from '@/constants/enums'

interface DepartmentTableProps {
  data: Department[]
  loading: boolean
  /** 编辑部门 */
  onEdit: (department: Department) => void
  /** 切换启用 / 停用 */
  onToggleStatus: (department: Department) => void
  /** 删除部门 */
  onDelete: (department: Department) => void
}

/**
 * 部门列表表格
 * @param props - 数据与行操作回调
 */
export const DepartmentTable = ({
  data,
  loading,
  onEdit,
  onToggleStatus,
  onDelete,
}: DepartmentTableProps) => {
  const columns: TableProps<Department>['columns'] = [
    {
      title: '部门名称',
      dataIndex: 'name',
      render: (name: string) => <span className="font-medium text-fg">{name}</span>,
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      width: 100,
      render: (isActive: boolean) => (
        <EnumTag enumDef={DepartmentStatus} value={isActive ? 'active' : 'inactive'} />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      fixed: 'end',
      render: (_, department) => (
        <div className="-ms-2 flex">
          <Button type="link" size="small" onClick={() => onEdit(department)}>
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger={department.is_active}
            onClick={() => onToggleStatus(department)}
          >
            {department.is_active ? '停用' : '启用'}
          </Button>
          <Button type="link" size="small" danger onClick={() => onDelete(department)}>
            删除
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-card shadow-card">
      <Table<Department>
        rowKey="department_id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: false,
          showTotal: (count) => `共 ${count} 个部门`,
          className: 'px-4',
        }}
        scroll={{ x: 600 }}
      />
    </div>
  )
}
