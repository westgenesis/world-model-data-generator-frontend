import { useQuery } from '@tanstack/react-query'
import type { TableProps } from 'antd'
import { Alert, Skeleton, Table } from 'antd'
import type { ProjectResources } from '@/api/projects'
import { projectResourcesQueryOptions } from '@/api/projects'
import { EnumTag } from '@/components/EnumTag'
import { SectionCard } from '@/components/SectionCard'
import { AlertStatus, ResourceType } from '@/constants/enums'
import { formatDateTime, formatNumber } from '@/lib/format'
import { UsageCard } from './UsageCard'

/** 提醒记录行 */
type AlertRow = ProjectResources['alerts'][number]

/** 提醒记录表格列 */
const ALERT_COLUMNS: TableProps<AlertRow>['columns'] = [
  {
    title: '时间',
    dataIndex: 'time',
    width: 120,
    render: (v: string) => <span className="tabular-nums">{formatDateTime(v, 'MM-DD HH:mm')}</span>,
  },
  {
    title: '类型',
    dataIndex: 'type',
    width: 80,
    render: (v: AlertRow['type']) => ResourceType.getLabel(v),
  },
  { title: '内容', dataIndex: 'content' },
  { title: '提醒对象', dataIndex: 'targets' },
  {
    title: '状态',
    dataIndex: 'status',
    width: 90,
    render: (v: AlertRow['status']) => <EnumTag enumDef={AlertStatus} value={v} />,
  },
]

/**
 * 项目详情 · 资源消耗：存储与算力用量、提醒记录
 * @param props.projectId - 项目 ID
 */
export const ProjectResourcesTab = ({ projectId }: { projectId: string }) => {
  const { data, isPending } = useQuery(projectResourcesQueryOptions(projectId))

  return (
    <div className="flex flex-col gap-4">
      <Alert
        type="info"
        showIcon
        title="此处仅记录用量并在达到参考值时提醒，不拦截、不扣减、不限制项目内任何操作。"
      />
      {isPending || !data ? (
        <Skeleton active />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <UsageCard
            title="存储"
            used={data.storage.usedTb}
            quota={data.storage.quotaTb}
            summary={`已用 ${formatNumber(data.storage.usedTb, 1)} TB / 参考值 ${formatNumber(data.storage.quotaTb)} TB`}
            metrics={data.storage.breakdown.map((item) => ({
              label: item.label,
              value: `${formatNumber(item.valueTb, 1)} TB`,
            }))}
          />
          <UsageCard
            title="生成算力"
            used={data.compute.usedHours}
            quota={data.compute.quotaHours}
            summary={`已用 ${formatNumber(data.compute.usedHours)} 卡时 / 参考值 ${formatNumber(data.compute.quotaHours)} 卡时`}
            metrics={[
              { label: '本月', value: `${formatNumber(data.compute.monthHours)} 卡时` },
              { label: '生成任务', value: `${formatNumber(data.compute.taskCount)} 个` },
              {
                label: '平均单任务',
                value: `${formatNumber(data.compute.avgHoursPerTask, 1)} 卡时`,
              },
            ]}
          />
        </div>
      )}
      <SectionCard title="提醒记录">
        <Table<AlertRow>
          rowKey="id"
          size="small"
          columns={ALERT_COLUMNS}
          dataSource={data?.alerts}
          loading={isPending}
          pagination={false}
          scroll={{ x: 640 }}
        />
      </SectionCard>
    </div>
  )
}
