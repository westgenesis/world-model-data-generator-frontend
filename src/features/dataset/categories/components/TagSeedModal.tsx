import { useQuery } from '@tanstack/react-query'
import { Modal, Table } from 'antd'
import { useMemo } from 'react'
import type { TagSet } from '@/api/datasets'
import { tagSeedListQueryOptions } from '@/api/datasets'
import { EnumTag } from '@/components/EnumTag'
import { TagSource } from '@/constants/enums'
import { useListParams } from '@/hooks/use-list-params'
import { EMPTY_TEXT, formatDateTime } from '@/lib/format'

interface TagSeedModalProps {
  /** 是否打开 */
  open: boolean
  /** 要查看关联数据的标签集；为空时查询不执行 */
  tagSet?: TagSet
  onClose: () => void
}

/**
 * 标签集关联数据弹窗：分页展示命中该标签集的片段
 * @param props - 打开状态、标签集与关闭回调
 */
export const TagSeedModal = ({ open, tagSet, onClose }: TagSeedModalProps) => {
  const list = useListParams({})
  const enabled = open && Boolean(tagSet)

  const { data, isPending, isFetching } = useQuery({
    ...tagSeedListQueryOptions(tagSet?.id ?? 0, list.params),
    enabled,
  })

  const rows = useMemo(() => data?.items ?? [], [data])
  const total = data?.total ?? 0

  return (
    <Modal
      open={enabled}
      title={tagSet ? `关联数据 · ${tagSet.name}` : '关联数据'}
      onCancel={onClose}
      footer={null}
      width={760}
    >
      <div className="overflow-hidden rounded-lg border border-line">
        <Table
          rowKey="seed_id"
          dataSource={rows}
          loading={isPending || isFetching}
          pagination={list.getPagination(total)}
          size="small"
          columns={[
            {
              title: '片段 ID',
              dataIndex: 'seed_id',
              width: 100,
              render: (seedId: number) => <span className="tabular-nums">#{seedId}</span>,
            },
            {
              title: '标签值',
              dataIndex: 'value',
              render: (value: string) => (
                <span className="font-medium text-fg">{value || EMPTY_TEXT}</span>
              ),
            },
            {
              title: '打标来源',
              dataIndex: 'source',
              width: 110,
              render: (source: TagSource) => <EnumTag enumDef={TagSource} value={source} />,
            },
            {
              title: '来源说明',
              dataIndex: 'source_label',
              render: (label: string) => <span className="text-fg-2">{label || EMPTY_TEXT}</span>,
            },
            {
              title: '打标时间',
              dataIndex: 'created_at',
              width: 160,
              render: (time: string) => formatDateTime(time),
            },
          ]}
        />
      </div>
    </Modal>
  )
}
