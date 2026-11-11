import type { TableProps } from 'antd'
import { Button, Drawer, Table, Tag, Upload } from 'antd'
import { FileSpreadsheet } from 'lucide-react'
import { useState } from 'react'
import type { UserImportRow } from '@/api/users'
import {
  confirmUserImport,
  previewUserImport,
  USER_IMPORT_TEMPLATE_URL,
  USERS_QUERY_KEY,
} from '@/api/users'
import { Department, UserRole } from '@/constants/enums'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { env } from '@/lib/env'
import { EMPTY_TEXT } from '@/lib/format'

interface UserImportDrawerProps {
  open: boolean
  onClose: () => void
}

/** 允许上传的文件类型 */
const ACCEPT = '.xlsx,.csv'

/** 预览表格列 */
const PREVIEW_COLUMNS: TableProps<UserImportRow>['columns'] = [
  { title: '姓名', dataIndex: 'name' },
  { title: '账号', dataIndex: 'account', render: (v: string) => v || EMPTY_TEXT },
  {
    title: '部门',
    dataIndex: 'department',
    render: (v: UserImportRow['department']) => (v ? Department.getLabel(v) : EMPTY_TEXT),
  },
  {
    title: '角色',
    dataIndex: 'role',
    render: (v: UserImportRow['role']) => (v ? UserRole.getLabel(v) : EMPTY_TEXT),
  },
  {
    title: '校验结果',
    dataIndex: 'error',
    render: (error: string | null) => (
      <Tag variant="filled" color={error ? 'error' : 'success'} className="me-0">
        {error ?? '通过'}
      </Tag>
    ),
  },
]

/**
 * 批量导入用户抽屉：上传文件 → 后端校验预览 → 导入校验通过的行
 * @param props - 打开状态与关闭回调
 */
export const UserImportDrawer = ({ open, onClose }: UserImportDrawerProps) => {
  const [rows, setRows] = useState<UserImportRow[]>([])
  const validRows = rows.filter((row) => !row.error)

  const preview = useActionMutation({
    mutationFn: previewUserImport,
    successMessage: false,
    onSuccess: setRows,
  })

  const confirm = useActionMutation({
    mutationFn: () => confirmUserImport(validRows),
    successMessage: ({ imported }) => `已导入 ${imported} 位用户`,
    invalidateKeys: [USERS_QUERY_KEY],
    onSuccess: onClose,
  })

  return (
    <Drawer
      open={open}
      title="批量导入用户"
      onClose={onClose}
      size={640}
      destroyOnHidden
      afterOpenChange={(visible) => !visible && setRows([])}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>取消</Button>
          <Button
            type="primary"
            disabled={!validRows.length}
            loading={confirm.isPending}
            onClick={() => confirm.mutate()}
          >
            确认导入（{validRows.length} 条）
          </Button>
        </div>
      }
    >
      <Upload.Dragger
        accept={ACCEPT}
        showUploadList={false}
        disabled={preview.isPending}
        beforeUpload={(file) => {
          preview.mutate(file)
          return false
        }}
      >
        <div className="flex flex-col items-center px-4 py-3">
          <FileSpreadsheet size={28} strokeWidth={1.75} className="mb-2 text-primary" />
          <div className="font-medium text-fg">拖拽文件到此处，或点击上传</div>
          <div className="mt-1 text-xs text-fg-3">支持 .xlsx / .csv，单次最多 500 条</div>
        </div>
      </Upload.Dragger>
      <div className="mt-2 text-end">
        <Button
          type="link"
          size="small"
          href={`${env.VITE_API_BASE_URL}/${USER_IMPORT_TEMPLATE_URL}`}
        >
          下载导入模板
        </Button>
      </div>

      <h3 className="mt-4 mb-2 font-semibold text-fg">导入预览</h3>
      <Table<UserImportRow>
        rowKey={(row) => `${row.name}-${row.account}`}
        size="small"
        columns={PREVIEW_COLUMNS}
        dataSource={rows}
        loading={preview.isPending}
        pagination={false}
        locale={{ emptyText: '上传文件后在此预览校验结果' }}
      />
    </Drawer>
  )
}
