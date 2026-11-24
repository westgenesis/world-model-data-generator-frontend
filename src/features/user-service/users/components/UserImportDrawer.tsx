import type { TableProps } from 'antd'
import { App, Button, Drawer, Spin, Table, Upload } from 'antd'
import { Download, FileSpreadsheet } from 'lucide-react'
import { useState } from 'react'
import type {
  UserImportAccepted,
  UserImportPreview,
  UserImportRow,
  UserImportTemplateFile,
} from '@/api/users'
import {
  downloadUserImportTemplate,
  previewUserImport,
  submitUserImport,
  USERS_QUERY_KEY,
} from '@/api/users'
import { useActionMutation } from '@/hooks/use-action-mutation'

interface UserImportDrawerProps {
  open: boolean
  onClose: () => void
}

/** 空单元格占位 */
const EMPTY_CELL = <span className="text-fg-3">—</span>

/** 逐行预览表格列 */
const ROW_COLUMNS: TableProps<UserImportRow>['columns'] = [
  { title: '姓名', dataIndex: 'full_name', width: 88, ellipsis: true },
  {
    title: '账号',
    dataIndex: 'username',
    width: 110,
    ellipsis: true,
    render: (username: string) => username || EMPTY_CELL,
  },
  {
    title: '部门',
    dataIndex: 'department',
    width: 110,
    ellipsis: true,
    render: (department: string) => department || EMPTY_CELL,
  },
  {
    title: '角色',
    dataIndex: 'role',
    width: 96,
    ellipsis: true,
    render: (role: string) => role || EMPTY_CELL,
  },
  {
    title: '校验结果',
    dataIndex: 'valid',
    width: 168,
    render: (valid: boolean, row) => {
      if (valid) {
        return (
          <span className="inline-block rounded-full bg-success-soft px-2 py-0.5 text-xs text-success">
            通过
          </span>
        )
      }
      const reason = row.issues.map((issue) => issue.message).join('；')
      return (
        <span
          className="inline-block rounded-full bg-danger-soft px-2 py-0.5 text-xs text-danger"
          title={reason || undefined}
        >
          {reason || '未通过校验'}
        </span>
      )
    },
  },
]

/**
 * 触发浏览器下载文件
 * @param file - 文件内容与文件名
 */
const saveFile = ({ blob, filename }: UserImportTemplateFile) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/**
 * 批量导入用户抽屉：下载模板 → 上传文件获取校验预览 → 按 file_id 提交导入任务
 * @param props - 打开状态与关闭回调
 */
export const UserImportDrawer = ({ open, onClose }: UserImportDrawerProps) => {
  const { message } = App.useApp()
  const [preview, setPreview] = useState<UserImportPreview | null>(null)

  const previewMutation = useActionMutation<File, UserImportPreview>({
    mutationFn: previewUserImport,
    successMessage: false,
    onSuccess: setPreview,
  })

  const downloadMutation = useActionMutation<void, UserImportTemplateFile>({
    mutationFn: downloadUserImportTemplate,
    successMessage: false,
    onSuccess: saveFile,
  })

  const submitMutation = useActionMutation<string, UserImportAccepted>({
    mutationFn: submitUserImport,
    successMessage: '导入任务已提交，处理完成后可在用户列表查看',
    invalidateKeys: [USERS_QUERY_KEY],
    onSuccess: onClose,
  })

  const canSubmit = Boolean(preview && preview.valid > 0 && preview.invalid === 0)

  return (
    <Drawer
      open={open}
      title="批量导入用户"
      size={600}
      onClose={onClose}
      destroyOnHidden
      afterOpenChange={(visible) => !visible && setPreview(null)}
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-fg-3">
            {!preview
              ? '请先上传导入文件'
              : preview.invalid > 0
                ? `有 ${preview.invalid} 行未通过校验，请修正后重新上传`
                : `将导入校验通过的 ${preview.valid} 行`}
          </span>
          <div className="flex gap-2">
            <Button onClick={onClose}>取消</Button>
            <Button
              type="primary"
              loading={submitMutation.isPending}
              disabled={!canSubmit}
              onClick={() => preview && submitMutation.mutate(preview.file_id)}
            >
              确认导入
            </Button>
          </div>
        </div>
      }
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-fg-2">使用导入模板填写用户信息，上传后先校验再导入。</p>
        <Button
          type="link"
          size="small"
          icon={<Download size={14} />}
          loading={downloadMutation.isPending}
          onClick={() => downloadMutation.mutate()}
          className="shrink-0"
        >
          下载导入模板
        </Button>
      </div>

      <Upload.Dragger
        accept=".xlsx"
        height={148}
        showUploadList={false}
        disabled={previewMutation.isPending}
        beforeUpload={(file) => {
          if (!file.name.toLowerCase().endsWith('.xlsx')) {
            message.error('仅支持 .xlsx 文件')
            return Upload.LIST_IGNORE
          }
          setPreview(null)
          previewMutation.mutate(file)
          return false
        }}
      >
        <div className="flex flex-col items-center gap-1.5">
          <span className="flex size-11 items-center justify-center rounded-full bg-primary-soft">
            <FileSpreadsheet size={22} strokeWidth={1.75} className="text-primary" />
          </span>
          <span className="mt-1 text-sm font-medium text-fg">拖拽文件到此处，或点击上传</span>
          <span className="text-xs text-fg-3">仅支持按导入模板填写的 .xlsx 文件</span>
        </div>
      </Upload.Dragger>

      <div className="mt-6">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h3 className="font-semibold text-fg">导入预览</h3>
          {preview && (
            <span className="min-w-0 truncate text-xs text-fg-3" title={preview.filename}>
              {preview.filename}
            </span>
          )}
        </div>

        {previewMutation.isPending ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-fg-3">
            <Spin size="small" />
            正在校验文件…
          </div>
        ) : preview ? (
          preview.rows.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-line">
              <Table<UserImportRow>
                rowKey="row"
                size="small"
                columns={ROW_COLUMNS}
                dataSource={preview.rows}
                pagination={false}
              />
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-fg-3">文件中没有可导入的数据。</p>
          )
        ) : (
          <p className="py-6 text-center text-sm text-fg-3">上传文件后将在此展示校验结果</p>
        )}
      </div>
    </Drawer>
  )
}
