import { useQuery } from '@tanstack/react-query'
import { Button, DatePicker, Input, Select, Tabs } from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { Download } from 'lucide-react'
import type { LogExportFile, LogFilterParams, LogItem, LogListParams } from '@/api/logs'
import { exportLogs, logListQueryOptions } from '@/api/logs'
import { FilterBar, FilterField } from '@/components/FilterBar'
import { PageHeader } from '@/components/PageHeader'
import type { LogCategory, LogLevel } from '@/constants/enums'
import { LogCategory as LogCategoryEnum, LogLevel as LogLevelEnum } from '@/constants/enums'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { useDrawerState } from '@/hooks/use-drawer-state'
import { useListParams } from '@/hooks/use-list-params'
import { AuditTab } from './components/AuditTab'
import { LogContextModal } from './components/LogContextModal'
import { LogDetailModal } from './components/LogDetailModal'
import { LogStats } from './components/LogStats'
import { LogStorageTab } from './components/LogStorageTab'
import { LogTable } from './components/LogTable'

/** 日志列表筛选条件 */
interface LogFilters {
  /** 时间范围，默认当天 */
  period: [Dayjs | null, Dayjs | null] | null
  category?: LogCategory
  level?: LogLevel
  /** 事件模块，如 user */
  module: string
  /** 内容 / 事件 key 关键词 */
  keyword: string
}

/** 筛选条件初始值：当天 0 点至当前时间 */
const createInitialFilters = (): LogFilters => ({
  period: [dayjs().startOf('day'), dayjs()],
  module: '',
  keyword: '',
})

/**
 * 把界面筛选条件转换为接口参数
 * @param filters - 界面筛选条件
 * @returns 日志筛选参数
 */
const toFilterParams = (filters: LogFilters): LogFilterParams => ({
  start: filters.period?.[0]?.toISOString(),
  end: filters.period?.[1]?.toISOString(),
  category: filters.category,
  level: filters.level,
  module: filters.module.trim() || undefined,
  keyword: filters.keyword.trim() || undefined,
})

/**
 * 触发浏览器下载文件
 * @param file - 文件内容与文件名
 */
const saveFile = ({ blob, filename }: LogExportFile) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** 日志管理页面（接口：/v1/logs，参考 docs/原型/M1用户服务管理_原型.html） */
export const LogManagementPage = () => {
  const { filters, setFilter, submit, reset, params, getPagination } = useListParams<LogFilters>(
    createInitialFilters(),
    { manualSearch: true },
  )

  const listParams: LogListParams = {
    ...toFilterParams(params),
    page: params.page,
    pageSize: params.pageSize,
  }
  const { data, isFetching } = useQuery(logListQueryOptions(listParams))
  const detailDrawer = useDrawerState<LogItem>()
  const contextDrawer = useDrawerState<LogItem>()

  const exportMutation = useActionMutation<void, LogExportFile>({
    mutationFn: () => exportLogs(toFilterParams(params)),
    successMessage: '已开始导出，请留意浏览器下载',
    onSuccess: saveFile,
  })

  return (
    <>
      <PageHeader
        title="日志管理"
        description="记录用户操作、业务事件与运行异常，支持按时间、分类与级别查询并导出。"
        extra={
          <Button
            icon={<Download size={16} strokeWidth={1.75} />}
            loading={exportMutation.isPending}
            onClick={() => exportMutation.mutate()}
          >
            导出日志
          </Button>
        }
      />

      <Tabs
        defaultActiveKey="query"
        items={[
          {
            key: 'query',
            label: '日志查询',
            children: (
              <>
                <LogStats />
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
                  <FilterField label="分类">
                    <Select
                      className="w-32"
                      placeholder="全部"
                      allowClear
                      value={filters.category}
                      onChange={(value) => setFilter('category', value)}
                      options={LogCategoryEnum.options}
                    />
                  </FilterField>
                  <FilterField label="级别">
                    <Select
                      className="w-32"
                      placeholder="全部"
                      allowClear
                      value={filters.level}
                      onChange={(value) => setFilter('level', value)}
                      options={LogLevelEnum.options}
                    />
                  </FilterField>
                  <FilterField label="模块">
                    <Input
                      className="w-32"
                      placeholder="如 user"
                      allowClear
                      value={filters.module}
                      onChange={(e) => setFilter('module', e.target.value)}
                      onPressEnter={submit}
                    />
                  </FilterField>
                  <FilterField label="关键词">
                    <Input
                      className="w-52"
                      placeholder="内容 / 事件 key"
                      allowClear
                      value={filters.keyword}
                      onChange={(e) => setFilter('keyword', e.target.value)}
                      onPressEnter={submit}
                    />
                  </FilterField>
                </FilterBar>

                <LogTable
                  data={data?.items ?? []}
                  loading={isFetching}
                  pagination={getPagination(data?.total)}
                  onDetail={detailDrawer.show}
                  onContext={contextDrawer.show}
                />
              </>
            ),
          },
          {
            key: 'audit',
            label: '安全审计',
            children: <AuditTab />,
          },
          {
            key: 'storage',
            label: '收集与存储',
            children: <LogStorageTab />,
          },
        ]}
      />

      <LogDetailModal
        open={detailDrawer.open}
        log={detailDrawer.record}
        onClose={detailDrawer.close}
      />
      <LogContextModal
        open={contextDrawer.open}
        log={contextDrawer.record}
        onClose={contextDrawer.close}
      />
    </>
  )
}
