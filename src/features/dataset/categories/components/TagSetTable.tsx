import type { TablePaginationConfig } from 'antd'
import { Button, Table, Tag } from 'antd'
import { Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import type { TagSet } from '@/api/datasets'
import { EnumTag } from '@/components/EnumTag'
import { SectionCard } from '@/components/SectionCard'
import { EnabledState, TagSetType } from '@/constants/enums'
import { EMPTY_TEXT, formatNumber } from '@/lib/format'

interface TagSetTableProps {
  tagSets: TagSet[]
  loading: boolean
  pagination: TablePaginationConfig
  /** 新增标签集 */
  onCreate: () => void
  /** 编辑标签集 */
  onEdit: (tagSet: TagSet) => void
  /** 切换启用 / 停用 */
  onToggleStatus: (tagSet: TagSet) => void
  /** 删除标签集 */
  onDelete: (tagSet: TagSet) => void
  /** 查看关联数据 */
  onShowSeeds: (tagSet: TagSet) => void
}

/**
 * 取值约束渲染：枚举型展示预设值 Tag 列表，数值型直接展示范围描述
 * @param value - 取值约束
 * @returns 展示节点
 */
const renderConstraint = (value: string[] | string): ReactNode => {
  if (Array.isArray(value)) {
    if (value.length === 0) return EMPTY_TEXT
    const visible = value.slice(0, 3)
    const rest = value.length - visible.length
    return (
      <div className="flex flex-wrap gap-1">
        {visible.map((item) => (
          <Tag key={item} className="me-0 text-xs">
            {item}
          </Tag>
        ))}
        {rest > 0 && <Tag className="me-0 text-xs">+{rest}</Tag>}
      </div>
    )
  }
  return value || EMPTY_TEXT
}

/**
 * 标签集表格：展示选中数据集下的标签集，支持新增、编辑、启停、删除与查看关联数据
 * @param props - 数据、分页与操作回调
 */
export const TagSetTable = ({
  tagSets,
  loading,
  pagination,
  onCreate,
  onEdit,
  onToggleStatus,
  onDelete,
  onShowSeeds,
}: TagSetTableProps) => (
  <SectionCard
    title="标签集"
    sub={`共 ${pagination.total ?? 0} 个`}
    extra={
      <Button
        type="primary"
        size="small"
        icon={<Plus size={14} strokeWidth={2} />}
        onClick={onCreate}
      >
        新增标签集
      </Button>
    }
  >
    <Table<TagSet>
      rowKey="id"
      dataSource={tagSets}
      loading={loading}
      pagination={pagination}
      scroll={{ x: 860 }}
      columns={[
        {
          title: '名称',
          dataIndex: 'name',
          fixed: 'left',
          render: (name: string) => <span className="font-medium text-fg">{name}</span>,
        },
        {
          title: '类型',
          dataIndex: 'type',
          width: 110,
          render: (type: TagSetType) => <EnumTag enumDef={TagSetType} value={type} />,
        },
        {
          title: '取值约束',
          dataIndex: 'value_constraint',
          render: (value: string[] | string) => renderConstraint(value),
        },
        {
          title: '打标来源',
          dataIndex: 'tag_source',
          width: 160,
          ellipsis: true,
          render: (source: string | null) => (
            <span className="text-fg-2">{source || EMPTY_TEXT}</span>
          ),
        },
        {
          title: '命中量',
          dataIndex: 'hit_count',
          width: 90,
          render: (count: number | null | undefined) => (
            <span className="text-fg-2 tabular-nums">{formatNumber(count)}</span>
          ),
        },
        {
          title: '状态',
          dataIndex: 'state',
          width: 100,
          render: (state: EnabledState) => <EnumTag enumDef={EnabledState} value={state} />,
        },
        {
          title: '操作',
          key: 'actions',
          width: 216,
          fixed: 'end',
          render: (_, tagSet) => (
            <div className="-ms-2 flex flex-wrap">
              <Button type="link" size="small" onClick={() => onEdit(tagSet)}>
                编辑
              </Button>
              <Button type="link" size="small" onClick={() => onShowSeeds(tagSet)}>
                关联数据
              </Button>
              <Button
                type="link"
                size="small"
                danger={tagSet.state === 'enabled'}
                onClick={() => onToggleStatus(tagSet)}
              >
                {tagSet.state === 'enabled' ? '停用' : '启用'}
              </Button>
              <Button type="link" size="small" danger onClick={() => onDelete(tagSet)}>
                删除
              </Button>
            </div>
          ),
        },
      ]}
    />
  </SectionCard>
)
