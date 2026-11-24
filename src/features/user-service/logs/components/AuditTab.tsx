import { useQuery } from '@tanstack/react-query'
import { DatePicker, Input, Select } from 'antd'
import type { Dayjs } from 'dayjs'
import type { AuditFilterParams, AuditItem, AuditListParams } from '@/api/audits'
import { auditListQueryOptions } from '@/api/audits'
import { FilterBar, FilterField } from '@/components/FilterBar'
import { AuditRiskLevel, AuditStatus } from '@/constants/enums'
import { useDrawerState } from '@/hooks/use-drawer-state'
import { useListParams } from '@/hooks/use-list-params'
import { AuditDetailModal } from './AuditDetailModal'
import { AuditHandleModal } from './AuditHandleModal'
import { AuditStats } from './AuditStats'
import { AuditTable } from './AuditTable'

/** 安全审计筛选条件 */
interface AuditFilters {
  /** 描述 / 事件 key 关键词 */
  keyword: string
  riskLevel?: AuditRiskLevel
  status?: AuditStatus
  /** 安全事件类型 code，如 login_failure */
  securityType: string
  /** 时间范围，默认不限 */
  period: [Dayjs | null, Dayjs | null] | null
}

/** 筛选条件初始值 */
const createInitialFilters = (): AuditFilters => ({
  keyword: '',
  securityType: '',
  period: null,
})

/**
 * 把界面筛选条件转换为接口参数
 * @param filters - 界面筛选条件
 * @returns 安全审计筛选参数
 */
const toFilterParams = (filters: AuditFilters): AuditFilterParams => ({
  start: filters.period?.[0]?.toISOString(),
  end: filters.period?.[1]?.toISOString(),
  riskLevel: filters.riskLevel,
  status: filters.status,
  securityType: filters.securityType.trim() || undefined,
  keyword: filters.keyword.trim() || undefined,
})

/** 安全审计页签：统计 + 查询列表 + 详情 / 处置弹窗 */
export const AuditTab = () => {
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
  const handleModal = useDrawerState<AuditItem>()

  return (
    <>
      <AuditStats />

      <FilterBar onSearch={submit} onReset={reset}>
        <FilterField label="关键词">
          <Input
            className="w-48"
            placeholder="描述 / 事件 key"
            allowClear
            value={filters.keyword}
            onChange={(e) => setFilter('keyword', e.target.value)}
            onPressEnter={submit}
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
        <FilterField label="状态">
          <Select
            className="w-28"
            placeholder="全部"
            allowClear
            value={filters.status}
            onChange={(value) => setFilter('status', value)}
            options={AuditStatus.options}
          />
        </FilterField>
        <FilterField label="事件类型">
          <Input
            className="w-40"
            placeholder="如 login_failure"
            allowClear
            value={filters.securityType}
            onChange={(e) => setFilter('securityType', e.target.value)}
            onPressEnter={submit}
          />
        </FilterField>
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
      </FilterBar>

      <AuditTable
        data={data?.items ?? []}
        loading={isFetching}
        pagination={getPagination(data?.total)}
        onDetail={detailModal.show}
        onHandle={handleModal.show}
      />

      <AuditDetailModal
        open={detailModal.open}
        audit={detailModal.record}
        onClose={detailModal.close}
        onHandle={handleModal.show}
      />
      <AuditHandleModal
        open={handleModal.open}
        audit={handleModal.record}
        onClose={handleModal.close}
      />
    </>
  )
}
