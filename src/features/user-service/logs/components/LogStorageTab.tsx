import { useQuery } from '@tanstack/react-query'
import { Alert, Table, Tag } from 'antd'
import type { TableProps } from 'antd'
import dayjs from 'dayjs'
import { ArrowDownToLine, Database, HardDrive, Server } from 'lucide-react'
import type { LogWriter } from '@/api/logs'
import { logStorageQueryOptions } from '@/api/logs'
import { EnumTag } from '@/components/EnumTag'
import { SectionCard } from '@/components/SectionCard'
import type { StatItem } from '@/components/StatCard'
import { StatGrid } from '@/components/StatCard'
import { LogSource } from '@/constants/enums'
import { TONE_TAG_COLOR } from '@/constants/tone'
import { EMPTY_TEXT, formatBytes, formatDateTime, formatNumber } from '@/lib/format'
import { getErrorMessage } from '@/lib/http'
import { StoragePolicyPanel } from './StoragePolicyPanel'

/** 统计卡片图标尺寸与线宽，与页面其他图标保持一致 */
const ICON_SIZE = 16

/** 写入端状态：超过 5 分钟未写入视为延迟，超过 1 小时视为无近期写入 */
const writerStatus = (lastTs: string | null) => {
  if (!lastTs) return { label: '暂无写入', tone: 'default' as const }
  const minutes = dayjs().diff(dayjs(lastTs), 'minute')
  if (minutes < 5) return { label: '正常', tone: 'success' as const }
  if (minutes < 60) return { label: '延迟', tone: 'warning' as const }
  return { label: '无近期写入', tone: 'default' as const }
}

/** 写入端表格列 */
const WRITER_COLUMNS: TableProps<LogWriter>['columns'] = [
  {
    title: '写入端',
    dataIndex: 'source',
    width: 150,
    render: (value: LogWriter['source']) => <EnumTag enumDef={LogSource} value={value} />,
  },
  {
    title: '今日写入',
    dataIndex: 'today',
    width: 150,
    render: (value: number) => (
      <span className="text-fg-2 tabular-nums">{formatNumber(value)} 条</span>
    ),
  },
  {
    title: '最近写入时间',
    dataIndex: 'last_ts',
    width: 200,
    render: (value: string | null) => (
      <span className="text-fg-2 tabular-nums">
        {value ? formatDateTime(value, 'YYYY-MM-DD HH:mm:ss') : EMPTY_TEXT}
      </span>
    ),
  },
  {
    title: '状态',
    key: 'status',
    width: 120,
    render: (_, writer) => {
      const status = writerStatus(writer.last_ts)
      return (
        <Tag variant="filled" color={TONE_TAG_COLOR[status.tone]} className="me-0">
          {status.label}
        </Tag>
      )
    },
  },
]

/** 收集与存储 Tab：存储统计、写入端状态与存储策略 */
export const LogStorageTab = () => {
  const { data, isPending, isError, error } = useQuery(logStorageQueryOptions)

  const items: StatItem[] = [
    {
      key: 'rows',
      label: '库内日志条数',
      value: data?.rows,
      icon: <Database size={ICON_SIZE} strokeWidth={1.75} />,
    },
    {
      key: 'total_bytes',
      label: '库内存储体积',
      value: data ? formatBytes(data.total_bytes) : undefined,
      icon: <HardDrive size={ICON_SIZE} strokeWidth={1.75} />,
      sub: data
        ? `热 ${data.hot_days} 天 · 温 ${data.warm_days} 天 · 冷 ${data.cold_days} 天`
        : undefined,
    },
    {
      key: 'today_bytes',
      label: '今日写入体积',
      tone: 'info',
      value: data ? formatBytes(data.today_bytes) : undefined,
      icon: <ArrowDownToLine size={ICON_SIZE} strokeWidth={1.75} />,
    },
    {
      key: 'writers',
      label: '写入端',
      tone: 'success',
      value: data?.writers.length,
      icon: <Server size={ICON_SIZE} strokeWidth={1.75} />,
      sub: data
        ? `${data.writers.filter((writer) => writer.today > 0).length} 个今日有写入`
        : undefined,
    },
  ]

  return (
    <>
      <StatGrid items={items} loading={isPending} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <SectionCard title="写入端" sub="按来源统计今日写入情况">
          {isError ? (
            <Alert type="error" showIcon message={getErrorMessage(error, '加载存储数据失败')} />
          ) : (
            <Table<LogWriter>
              rowKey="source"
              columns={WRITER_COLUMNS}
              dataSource={data?.writers ?? []}
              loading={isPending}
              pagination={false}
              scroll={{ x: 620 }}
            />
          )}
        </SectionCard>

        <StoragePolicyPanel />
      </div>
    </>
  )
}
