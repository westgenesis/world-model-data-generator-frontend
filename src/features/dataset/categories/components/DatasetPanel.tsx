import { Button, Empty, Input, Skeleton } from 'antd'
import { ChevronDown, Database, Plus, Search, Sprout, WandSparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Dataset } from '@/api/datasets'
import { EnumTag } from '@/components/EnumTag'
import { EnabledState } from '@/constants/enums'
import type { DatasetType } from '@/constants/enums'
import { formatNumber } from '@/lib/format'

interface DatasetPanelProps {
  datasets: Dataset[]
  /** 当前选中的数据集 ID */
  selectedId: number | null
  loading: boolean
  /** 选中数据集 */
  onSelect: (id: number) => void
  /** 新建数据集 */
  onCreate: () => void
}

/** 数据集类型分组配置：图标、图标底色与展示文案 */
const GROUP_META: Record<DatasetType, { label: string; icon: ReactNode; chip: string }> = {
  seed: {
    label: '种子数据集',
    icon: <Sprout size={14} strokeWidth={2} />,
    chip: 'bg-primary-soft text-primary',
  },
  synthetic: {
    label: '合成数据集',
    icon: <WandSparkles size={14} strokeWidth={2} />,
    chip: 'bg-purple-soft text-purple',
  },
}

/**
 * 左侧数据集面板：按类型分组展示，组头带图标标识，支持本地搜索与选中高亮
 * @param props - 数据、选中状态与回调
 */
export const DatasetPanel = ({
  datasets,
  selectedId,
  loading,
  onSelect,
  onCreate,
}: DatasetPanelProps) => {
  const [keyword, setKeyword] = useState('')
  /** 已折叠的分组类型集合 */
  const [collapsed, setCollapsed] = useState<ReadonlySet<DatasetType>>(() => new Set())

  /** 展开 / 收起分组 */
  const toggleGroup = (type: DatasetType) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  /** 按关键词过滤后的数据集，并按类型分组 */
  const groups = useMemo(() => {
    const filtered = keyword.trim()
      ? datasets.filter(
          (dataset) =>
            dataset.name.toLowerCase().includes(keyword.trim().toLowerCase()) ||
            (dataset.description ?? '').toLowerCase().includes(keyword.trim().toLowerCase()),
        )
      : datasets
    return (Object.keys(GROUP_META) as DatasetType[]).map((type) => ({
      type,
      ...GROUP_META[type],
      items: filtered.filter((dataset) => dataset.type === type),
    }))
  }, [datasets, keyword])

  return (
    <aside className="flex max-h-[60vh] min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-card shadow-card lg:max-h-none">
      <div className="flex items-center gap-2.5 border-b border-line px-4 py-3.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-sunken text-fg-2">
          <Database size={15} strokeWidth={1.75} />
        </span>
        <h2 className="text-[13px] font-semibold text-fg">数据集</h2>
        <span className="rounded bg-sunken px-1.5 py-0.5 text-xs text-fg-3 tabular-nums">
          {loading ? '…' : datasets.length}
        </span>
        <Button
          className="ms-auto"
          size="small"
          type="primary"
          ghost
          icon={<Plus size={14} strokeWidth={2} />}
          onClick={onCreate}
        >
          新建
        </Button>
      </div>

      <div className="border-b border-line p-3 pb-2.5">
        <Input
          allowClear
          size="small"
          placeholder="搜索数据集"
          prefix={<Search size={14} strokeWidth={2} className="text-fg-3" />}
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-3">
        {loading ? (
          <div className="space-y-3">
            <Skeleton active paragraph={{ rows: 2 }} title={false} />
            <Skeleton active paragraph={{ rows: 2 }} title={false} />
          </div>
        ) : groups.every((group) => group.items.length === 0) ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={keyword ? '没有匹配的数据集' : '暂无数据集'}
          />
        ) : (
          groups.map(
            (group) =>
              group.items.length > 0 && (
                <section key={group.type}>
                  <button
                    type="button"
                    aria-expanded={!collapsed.has(group.type)}
                    onClick={() => toggleGroup(group.type)}
                    className="mb-2 flex w-full items-center gap-1.5 rounded-md px-1 py-1 text-left transition-colors hover:bg-sunken"
                  >
                    <ChevronDown
                      size={14}
                      strokeWidth={2}
                      className={`shrink-0 text-fg-3 transition-transform duration-300 ${
                        collapsed.has(group.type) ? '-rotate-90' : ''
                      }`}
                    />
                    <span
                      className={`flex size-6 shrink-0 items-center justify-center rounded-md ${group.chip}`}
                    >
                      {group.icon}
                    </span>
                    <span className="text-[13px] font-semibold text-fg">{group.label}</span>
                    <span className="rounded bg-sunken px-1.5 py-0.5 text-xs text-fg-3 tabular-nums">
                      {group.items.length}
                    </span>
                  </button>
                  <div
                    className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                      collapsed.has(group.type) ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
                    }`}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div className="space-y-1">
                        {group.items.map((dataset) => {
                          const selected = dataset.id === selectedId
                          return (
                            <button
                              key={dataset.id}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => onSelect(dataset.id)}
                              className={`relative w-full overflow-hidden rounded-lg border px-3 py-2.5 text-left transition-colors duration-200 ${
                                selected
                                  ? 'border-primary/40 bg-primary-soft'
                                  : 'border-transparent hover:bg-sunken'
                              }`}
                            >
                              <span
                                aria-hidden
                                className={`absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-primary transition-opacity ${
                                  selected ? 'opacity-100' : 'opacity-0'
                                }`}
                              />
                              <div className="flex items-center gap-2">
                                <span
                                  className={`min-w-0 flex-1 truncate text-[13px] font-medium ${
                                    selected ? 'text-primary' : 'text-fg'
                                  }`}
                                >
                                  {dataset.name}
                                </span>
                                <EnumTag enumDef={EnabledState} value={dataset.state} />
                              </div>
                              <div className="mt-1 flex items-center gap-2 text-xs text-fg-3">
                                <span>片段 {formatNumber(dataset.member_count)}</span>
                                <span className="text-line-strong">·</span>
                                <span>标签集 {formatNumber(dataset.tag_set_count)}</span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </section>
              ),
          )
        )}
      </div>
    </aside>
  )
}
