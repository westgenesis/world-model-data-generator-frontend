import type { TableProps } from 'antd'
import { App, Button, Drawer, Spin, Table, Upload } from 'antd'
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet } from 'lucide-react'
import { useState } from 'react'
import type { UserImportAccepted, UserImportPreview, UserImportTemplateFile } from '@/api/users'
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

/** 校验问题表格列 */
const ISSUE_COLUMNS: TableProps<UserImportPreview['issues'][number]>['columns'] = [
  { title: '行号', dataIndex: 'row', width: 88, render: (row: number) => `第 ${row} 行` },
  { title: '列名', dataIndex: 'column', width: 140 },
  { title: '问题', dataIndex: 'message' },
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

/** 预览统计中的单项 */
const StatItem = ({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: 'success' | 'danger'
}) => (
  <div className="px-4 py-3">
    <div className="text-xs text-fg-3">{label}</div>
    <div
      className={
        tone === 'success'
          ? 'mt-1 text-lg font-semibold text-success tabular-nums'
          : tone === 'danger'
            ? 'mt-1 text-lg font-semibold text-danger tabular-nums'
            : 'mt-1 text-lg font-semibold text-fg tabular-nums'
      }
    >
      {value}
    </div>
  </div>
)

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

  const canSubmit = Boolean(preview && preview.valid > 0)

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
            {preview ? `将导入校验通过的 ${preview.valid} 行` : '请先上传导入文件'}
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
          <div className="space-y-3">
            <div className="grid grid-cols-3 divide-x divide-line rounded-lg border border-line">
              <StatItem label="总行数" value={preview.total} />
              <StatItem label="校验通过" value={preview.valid} tone="success" />
              <StatItem
                label="问题行"
                value={preview.invalid}
                tone={preview.invalid > 0 ? 'danger' : undefined}
              />
            </div>

            {preview.invalid > 0 ? (
              <p className="flex items-start gap-1.5 text-sm text-warning">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />有 {preview.invalid}{' '}
                行未通过校验，确认导入时仅导入校验通过的 {preview.valid} 行。
              </p>
            ) : preview.total > 0 ? (
              <p className="flex items-center gap-1.5 text-sm text-success">
                <CheckCircle2 size={15} className="shrink-0" />
                全部 {preview.total} 行校验通过。
              </p>
            ) : (
              <p className="text-sm text-fg-3">文件中没有可导入的数据。</p>
            )}

            {preview.issues.length > 0 && (
              <div className="overflow-hidden rounded-lg border border-line">
                <Table<UserImportPreview['issues'][number]>
                  rowKey={(issue) => `${issue.row}-${issue.column}`}
                  size="small"
                  columns={ISSUE_COLUMNS}
                  dataSource={preview.issues}
                  pagination={false}
                  scroll={{ y: 220 }}
                />
              </div>
            )}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-fg-3">上传文件后将在此展示校验结果</p>
        )}
      </div>
    </Drawer>
  )
}
