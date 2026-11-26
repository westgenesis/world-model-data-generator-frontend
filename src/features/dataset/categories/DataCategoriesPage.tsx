import { useQuery } from '@tanstack/react-query'
import { App } from 'antd'
import { Database } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Dataset, TagSet, TagSetListParams } from '@/api/datasets'
import {
  DATASETS_QUERY_KEY,
  TAG_SETS_QUERY_KEY,
  datasetListQueryOptions,
  deleteTagSet,
  setTagSetState,
  tagSetListQueryOptions,
  updateDataset,
} from '@/api/datasets'
import { PageHeader } from '@/components/PageHeader'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { useDrawerState } from '@/hooks/use-drawer-state'
import { useListParams } from '@/hooks/use-list-params'
import { useAppStore } from '@/stores/app-store'
import { DatasetDetail } from './components/DatasetDetail'
import { DatasetFormDrawer } from './components/DatasetFormDrawer'
import { DatasetPanel } from './components/DatasetPanel'
import { TagSeedModal } from './components/TagSeedModal'
import { TagSetFormDrawer } from './components/TagSetFormDrawer'
import { TagSetTable } from './components/TagSetTable'

/** 左侧面板一次拉取的数据集条数上限（后端单页上限） */
const DATASET_PANEL_SIZE = 200

/** 未选中数据集时的右侧引导空态 */
const EmptyGuide = () => (
  <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-xl border border-dashed border-line bg-card text-center">
    <span className="flex size-14 items-center justify-center rounded-2xl bg-sunken text-fg-3">
      <Database size={24} strokeWidth={1.5} />
    </span>
    <p className="mt-4 text-sm font-medium text-fg">从左侧选择一个数据集</p>
    <p className="mt-1 text-[13px] text-fg-3">查看数据集详情，并维护其下的标签集</p>
  </div>
)

/** 数据分类管理页面（接口：datasets / cls 分类） */
export const DataCategoriesPage = () => {
  const { modal } = App.useApp()

  /* ------------------------------ 数据集面板 ------------------------------ */

  const currentProjectId = useAppStore((s) => s.currentProjectId)
  /** 顶栏当前项目对应的数字 ID；未选择项目时为 undefined */
  const projectId = Number(currentProjectId) || undefined

  const { data, isPending } = useQuery(
    datasetListQueryOptions({ page: 1, pageSize: DATASET_PANEL_SIZE, project_id: projectId }),
  )
  const datasets = useMemo(() => data?.items ?? [], [data])

  /** 当前选中的数据集 ID；未选择时为 null */
  const [selectedId, setSelectedId] = useState<number | null>(null)

  /** 选中数据集：未选中或选中项已失效时回落到第一个数据集 */
  const selected = useMemo(
    () => datasets.find((dataset) => dataset.id === selectedId) ?? datasets[0] ?? null,
    [datasets, selectedId],
  )

  /* ------------------------------- 标签集 ------------------------------- */

  const tagList = useListParams<TagSetListParams>({})
  const tagQuery = useQuery({
    ...tagSetListQueryOptions(selected?.id ?? 0, tagList.params),
    enabled: Boolean(selected),
  })
  const tagSets = useMemo(() => tagQuery.data?.items ?? [], [tagQuery.data])

  /** 切换数据集时回到第一页 */
  const handleSelect = (id: number) => {
    setSelectedId(id)
    tagList.reset()
  }

  /* -------------------------------- 抽屉 -------------------------------- */

  const datasetDrawer = useDrawerState<Dataset>()
  const tagSetDrawer = useDrawerState<TagSet>()
  const seedModal = useDrawerState<TagSet>()

  /* ------------------------------- 写操作 ------------------------------- */

  const toggleDataset = useActionMutation({
    mutationFn: (dataset: Dataset) =>
      updateDataset(dataset.id, {
        state: dataset.state === 'enabled' ? 'disabled' : 'enabled',
      }),
    successMessage: (_, dataset) => (dataset.state === 'enabled' ? '数据集已停用' : '数据集已启用'),
    invalidateKeys: [DATASETS_QUERY_KEY],
  })

  const toggleTagSet = useActionMutation({
    mutationFn: (tagSet: TagSet) =>
      setTagSetState(tagSet.id, tagSet.state === 'enabled' ? 'disabled' : 'enabled'),
    successMessage: (_, tagSet) => (tagSet.state === 'enabled' ? '标签集已停用' : '标签集已启用'),
    invalidateKeys: [TAG_SETS_QUERY_KEY],
  })

  const removeTagSet = useActionMutation({
    mutationFn: (tagSet: TagSet) => deleteTagSet(tagSet.id),
    successMessage: '标签集已删除',
    invalidateKeys: [TAG_SETS_QUERY_KEY],
  })

  const confirmRemoveTagSet = (tagSet: TagSet) => {
    modal.confirm({
      title: `删除标签集「${tagSet.name}」？`,
      content: '删除后不可恢复；若该标签集已被片段引用，将只能停用不能删除。',
      okText: '删除',
      okButtonProps: { danger: true },
      onOk: () => removeTagSet.mutateAsync(tagSet),
    })
  }

  return (
    <>
      <PageHeader
        title="数据分类管理"
        description="维护种子数据与合成数据的分类体系，并管理各数据集下的标签集；从左侧选择数据集查看详情。"
      />

      <div className="grid gap-4 lg:h-[calc(100vh-13rem)] lg:grid-cols-[360px_minmax(0,1fr)]">
        <DatasetPanel
          datasets={datasets}
          selectedId={selected?.id ?? null}
          loading={isPending}
          onSelect={handleSelect}
          onCreate={() => datasetDrawer.show()}
        />

        <div className="min-w-0 lg:min-h-0 lg:overflow-y-auto">
          {selected ? (
            <div className="flex flex-col gap-4">
              <DatasetDetail
                dataset={selected}
                onEdit={() => datasetDrawer.show(selected)}
                onToggleStatus={() => toggleDataset.mutate(selected)}
              />
              <TagSetTable
                tagSets={tagSets}
                loading={tagQuery.isFetching}
                pagination={tagList.getPagination(tagQuery.data?.total ?? 0)}
                onCreate={() => tagSetDrawer.show()}
                onEdit={tagSetDrawer.show}
                onToggleStatus={toggleTagSet.mutate}
                onDelete={confirmRemoveTagSet}
                onShowSeeds={seedModal.show}
              />
            </div>
          ) : (
            <EmptyGuide />
          )}
        </div>
      </div>

      <DatasetFormDrawer
        open={datasetDrawer.open}
        dataset={datasetDrawer.record}
        onClose={datasetDrawer.close}
      />
      <TagSetFormDrawer
        open={tagSetDrawer.open}
        datasetId={selected?.id ?? 0}
        tagSet={tagSetDrawer.record}
        onClose={tagSetDrawer.close}
      />
      <TagSeedModal open={seedModal.open} tagSet={seedModal.record} onClose={seedModal.close} />
    </>
  )
}
