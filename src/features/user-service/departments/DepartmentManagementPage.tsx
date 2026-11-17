import { useQuery } from '@tanstack/react-query'
import { App, Button } from 'antd'
import { Plus } from 'lucide-react'
import { useMemo } from 'react'
import type { Department } from '@/api/departments'
import {
  deleteDepartment,
  DEPARTMENTS_QUERY_KEY,
  departmentListQueryOptions,
  updateDepartment,
} from '@/api/departments'
import { PageHeader } from '@/components/PageHeader'
import { StatGrid } from '@/components/StatCard'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { useDrawerState } from '@/hooks/use-drawer-state'
import { DepartmentFormDrawer } from './components/DepartmentFormDrawer'
import { DepartmentTable } from './components/DepartmentTable'

/** 部门管理页面（接口：GET / POST /v1/departments） */
export const DepartmentManagementPage = () => {
  const { modal } = App.useApp()
  const { data, isPending, isFetching } = useQuery(departmentListQueryOptions)
  const drawer = useDrawerState<Department>()

  const departments = useMemo(() => data ?? [], [data])

  const stats = useMemo(
    () => ({
      total: departments.length,
      active: departments.filter((item) => item.is_active).length,
      inactive: departments.filter((item) => !item.is_active).length,
    }),
    [departments],
  )

  const toggleStatus = useActionMutation({
    mutationFn: (department: Department) =>
      updateDepartment(department.department_id, { is_active: !department.is_active }),
    successMessage: (_, department) => (department.is_active ? '部门已停用' : '部门已启用'),
    invalidateKeys: [DEPARTMENTS_QUERY_KEY],
  })

  const remove = useActionMutation({
    mutationFn: (department: Department) => deleteDepartment(department.department_id),
    successMessage: '部门已删除',
    invalidateKeys: [DEPARTMENTS_QUERY_KEY],
  })

  const confirmRemove = (department: Department) => {
    modal.confirm({
      title: `删除部门「${department.name}」？`,
      content: '删除后不可恢复；若仍有用户归属该部门，需先调整这些用户的所属部门。',
      okText: '删除',
      okButtonProps: { danger: true },
      onOk: () => remove.mutateAsync(department),
    })
  }

  return (
    <>
      <PageHeader
        title="部门管理"
        description="维护组织架构中的部门，供用户归属与筛选；停用后新建用户不能再选择，已归属的用户不受影响。"
        extra={
          <Button
            type="primary"
            icon={<Plus size={16} strokeWidth={1.75} />}
            onClick={() => drawer.show()}
          >
            新增部门
          </Button>
        }
      />

      <StatGrid
        loading={isPending}
        items={[
          { key: 'total', label: '部门总数', value: stats.total },
          { key: 'active', label: '启用', tone: 'success', value: stats.active },
          { key: 'inactive', label: '停用', tone: 'default', value: stats.inactive },
        ]}
      />

      <DepartmentTable
        data={departments}
        loading={isFetching}
        onEdit={drawer.show}
        onToggleStatus={toggleStatus.mutate}
        onDelete={confirmRemove}
      />

      <DepartmentFormDrawer open={drawer.open} department={drawer.record} onClose={drawer.close} />
    </>
  )
}
