import { useQuery } from '@tanstack/react-query'
import type { TableProps } from 'antd'
import { Skeleton, Table, Tag, Timeline } from 'antd'
import type { ProjectDetail, ProjectOverview } from '@/api/projects'
import { projectOverviewQueryOptions } from '@/api/projects'
import { SectionCard } from '@/components/SectionCard'
import { StatGrid } from '@/components/StatCard'
import { ProjectActivityType } from '@/constants/enums'
import { TONE_COLOR_VAR } from '@/constants/tone'
import { formatDateTime, formatNumber, formatSignedPercent } from '@/lib/format'

/** 数据量增长行 */
type GrowthRow = ProjectOverview['growth'][number]

/** 数据量增长表格列 */
const GROWTH_COLUMNS: TableProps<GrowthRow>['columns'] = [
  { title: '月份', dataIndex: 'month' },
  {
    title: '新增数据量',
    dataIndex: 'sizeTb',
    align: 'end',
    render: (v: number) => `${formatNumber(v, 1)} TB`,
  },
  { title: '生成条数', dataIndex: 'count', align: 'end', render: (v: number) => formatNumber(v) },
  {
    title: '环比',
    dataIndex: 'ratio',
    align: 'end',
    render: (v: number | null) => (
      <Tag variant="filled" color={v !== null && v > 0 ? 'success' : 'default'} className="me-0">
        {formatSignedPercent(v)}
      </Tag>
    ),
  },
]

/**
 * 项目详情 · 概览：核心指标、数据量增长与最近动态
 * @param props.project - 项目
 */
export const ProjectOverviewTab = ({ project }: { project: ProjectDetail }) => {
  const { data, isPending } = useQuery(projectOverviewQueryOptions(project.id))

  return (
    <>
      <StatGrid
        loading={isPending}
        items={[
          { key: 'size', label: '数据量', value: formatNumber(project.dataSizeTb, 1), unit: 'TB' },
          { key: 'tasks', label: '生成任务', value: formatNumber(project.taskCount) },
          { key: 'scenes', label: '场景数', value: formatNumber(project.sceneCount) },
          { key: 'datasets', label: '数据集', value: formatNumber(data?.datasetCount) },
          { key: 'clips', label: '合成片段', value: formatNumber(data?.clipCount) },
          { key: 'members', label: '成员', value: formatNumber(project.memberCount) },
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="数据量增长" sub="近 6 个月">
          <Table<GrowthRow>
            rowKey="month"
            size="small"
            columns={GROWTH_COLUMNS}
            dataSource={data?.growth}
            loading={isPending}
            pagination={false}
          />
        </SectionCard>
        <SectionCard title="最近动态">
          {isPending ? (
            <Skeleton active />
          ) : (
            <Timeline
              className="pt-2"
              items={data?.activities.map((activity) => ({
                key: activity.id,
                color: TONE_COLOR_VAR[ProjectActivityType.getTone(activity.type)],
                content: (
                  <div className="pb-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-medium text-fg">{activity.title}</span>
                      <span className="text-xs text-fg-3 tabular-nums">
                        {formatDateTime(activity.time, 'MM-DD HH:mm')}
                      </span>
                    </div>
                    <div className="text-[13px] text-fg-2">{activity.description}</div>
                  </div>
                ),
              }))}
            />
          )}
        </SectionCard>
      </div>
    </>
  )
}
