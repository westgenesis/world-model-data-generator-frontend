import { Form, Input, Radio } from 'antd'
import type { Department, DepartmentCreateInput, DepartmentUpdateInput } from '@/api/departments'
import {
  createDepartment,
  departmentCreateSchema,
  DEPARTMENTS_QUERY_KEY,
  updateDepartment,
} from '@/api/departments'
import { FormDrawer } from '@/components/FormDrawer'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { zodRule } from '@/lib/form'

interface DepartmentFormDrawerProps {
  open: boolean
  /** 编辑的部门；为空时为新增 */
  department?: Department
  onClose: () => void
}

/** 新增与编辑共用的表单值 */
type DepartmentFormValues = DepartmentCreateInput & DepartmentUpdateInput

/**
 * 新增 / 编辑部门抽屉
 * @param props - 打开状态、编辑对象与关闭回调
 */
export const DepartmentFormDrawer = ({ open, department, onClose }: DepartmentFormDrawerProps) => {
  const isEdit = Boolean(department)
  const shape = departmentCreateSchema.shape

  const mutation = useActionMutation({
    mutationFn: (values: DepartmentFormValues) =>
      department
        ? updateDepartment(department.department_id, {
            name: values.name,
            is_active: values.is_active,
          })
        : createDepartment(departmentCreateSchema.parse(values)),
    successMessage: isEdit ? '部门已更新' : '部门已创建',
    invalidateKeys: [DEPARTMENTS_QUERY_KEY],
    onSuccess: onClose,
  })

  return (
    <FormDrawer<DepartmentFormValues>
      open={open}
      title={isEdit ? `编辑部门 · ${department?.name}` : '新增部门'}
      onClose={onClose}
      onSubmit={(values) => mutation.mutate(values)}
      submitting={mutation.isPending}
      initialValues={
        department ? { name: department.name, is_active: department.is_active } : { name: '' }
      }
      submitText={isEdit ? '保存' : '创建'}
    >
      <Form.Item
        name="name"
        label="部门名称"
        required
        rules={[zodRule(shape.name)]}
        className="sm:col-span-2"
      >
        <Input placeholder="如：算法研发部" maxLength={64} showCount />
      </Form.Item>

      {isEdit && (
        <Form.Item
          name="is_active"
          label="状态"
          className="sm:col-span-2"
          extra="停用后新建用户不能再选择该部门，已归属的用户不受影响。"
        >
          <Radio.Group
            options={[
              { value: true, label: '启用' },
              { value: false, label: '停用' },
            ]}
          />
        </Form.Item>
      )}
    </FormDrawer>
  )
}
