import { useQuery } from '@tanstack/react-query'
import { Button, DatePicker, Input, Select } from 'antd'
import type { Dayjs } from 'dayjs'
import { Download } from 'lucide-react'
import type { AuditExportFile, AuditFilterParams, AuditItem, AuditListParams } from '@/api/audits'
import { auditListQueryOptions, exportAudits } from '@/api/audits'
import { FilterBar, FilterField } from '@/components/FilterBar'
import { PageHeader } from '@/components/PageHeader'
import { AuditRiskLevel } from '@/constants/enums'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { useDrawerState } from '@/hooks/use-drawer-state'
import { useListParams } from '@/hooks/use-list-params'
import { AuditDetailModal } from './components/AuditDetailModal'
import { AuditStats } from './components/AuditStats'
import { AuditTable } from './components/AuditTable'

/** 日志筛选条件 */
interface AuditFilters {
  /** 时间范围，默认不限 */
  period: [Dayjs | null, Dayjs | null] | null
  riskLevel?: AuditRiskLevel
  /** 大模块，如 user */
  module: string
  /** 操作人用户名，精确匹配 */
  operatorName: string
  /** 链路标识 */
  traceId: string
  /** 描述 / 事件 key / 对象名关键词 */
  keyword: string
}

/** 筛选条件初始值 */
const createInitialFilters = (): AuditFilters => ({
  period: null,
  module: '',
  operatorName: '',
  traceId: '',
  keyword: '',
})

/**
 * 把界面筛选条件转换为接口参数
 * @param filters - 界面筛选条件
 * @returns 日志筛选参数
 */
const toFilterParams = (filters: AuditFilters): AuditFilterParams => ({
  start: filters.period?.[0]?.toISOString(),
  end: filters.period?.[1]?.toISOString(),
  riskLevel: filters.riskLevel,
  module: filters.module.trim() || undefined,
  operatorName: filters.operatorName.trim() || undefined,
  traceId: filters.traceId.trim() || undefined,
  keyword: filters.keyword.trim() || undefined,
})

/**
 * 触发浏览器下载文件
 * @param file - 文件内容与文件名
 */
const saveFile = ({ blob, filename }: AuditExportFile) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** 日志管理页面（接口：/v1/audits，参考 docs/原型/M1用户服务管理_原型.html） */
export const LogManagementPage = () => {
  const { filters, setFilter, submit, reset, params, getPagination } = useListParams<AuditFilters>(
    createInitialFilters(),
    { manualSearch: true },
  )

  const listParams: AuditListParams = {
    ...toFilterParams(params),
    page: params.page,
    pageSize: params.pageSize,
  }
  const { data, isFetching } = useQuery(auditListQueryOptions(listParams))
  const detailModal = useDrawerState<AuditItem>()

  const exportMutation = useActionMutation<void, AuditExportFile>({
    mutationFn: () => exportAudits(toFilterParams(params)),
    successMessage: '已开始导出，请留意浏览器下载',
    onSuccess: saveFile,
  })

  return (
    <>
      <PageHeader
        title="日志管理"
        description="记录平台内的日志事件，支持按时间、风险等级与关键词查询并导出。"
        extra={
          <Button
            icon={<Download size={16} strokeWidth={1.75} />}
            loading={exportMutation.isPending}
            onClick={() => exportMutation.mutate()}
          >
            导出
          </Button>
        }
      />

      <AuditStats />

      <FilterBar onSearch={submit} onReset={reset}>
        <FilterField label="时间范围">
          <DatePicker.RangePicker
            className="w-96"
            showTime={{ format: 'HH:mm' }}
            format="YYYY-MM-DD HH:mm"
            allowClear
            value={filters.period}
            onChange={(value) => setFilter('period', value)}
          />
        </FilterField>
        <FilterField label="风险等级">
          <Select
            className="w-28"
            placeholder="全部"
            allowClear
            value={filters.riskLevel}
            onChange={(value) => setFilter('riskLevel', value)}
            options={AuditRiskLevel.options}
          />
        </FilterField>
        <FilterField label="模块">
          <Input
            className="w-32"
            placeholder="如 user / system"
            allowClear
            value={filters.module}
            onChange={(e) => setFilter('module', e.target.value)}
            onPressEnter={submit}
          />
        </FilterField>
        <FilterField label="操作人">
          <Input
            className="w-36"
            placeholder="操作人用户名"
            allowClear
            value={filters.operatorName}
            onChange={(e) => setFilter('operatorName', e.target.value)}
            onPressEnter={submit}
          />
        </FilterField>
        <FilterField label="TraceID">
          <Input
            className="w-40"
            placeholder="链路标识"
            allowClear
            value={filters.traceId}
            onChange={(e) => setFilter('traceId', e.target.value)}
            onPressEnter={submit}
          />
        </FilterField>
        <FilterField label="关键词">
          <Input
            className="w-52"
            placeholder="描述 / 事件 key / 对象名"
            allowClear
            value={filters.keyword}
            onChange={(e) => setFilter('keyword', e.target.value)}
            onPressEnter={submit}
          />
        </FilterField>
      </FilterBar>

      <AuditTable
        data={data?.items ?? []}
        loading={isFetching}
        pagination={getPagination(data?.total)}
        onDetail={detailModal.show}
      />

      <AuditDetailModal
        open={detailModal.open}
        audit={detailModal.record}
        onClose={detailModal.close}
      />
    </>
  )
}
