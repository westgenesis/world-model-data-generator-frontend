import type { TableProps } from 'antd'
import { Alert, App, Button, Table } from 'antd'
import { Plus } from 'lucide-react'
import type { ProjectMember } from '@/api/projects'
import { PROJECTS_QUERY_KEY, removeProjectMember } from '@/api/projects'
import { EnumTag } from '@/components/EnumTag'
import { SectionCard } from '@/components/SectionCard'
import { DataScope, ProjectMemberRole } from '@/constants/enums'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { formatDate, formatDateTime } from '@/lib/format'

interface ProjectMembersTabProps {
  projectId: string
  members: ProjectMember[]
  loading: boolean
  /** 是否允许编辑（已归档项目只读） */
  editable: boolean
  /** 添加成员 */
  onAdd: () => void
  /** 编辑成员 */
  onEdit: (member: ProjectMember) => void
}

/**
 * 项目详情 · 成员列表
 * @param props - 成员数据与操作回调
 */
export const ProjectMembersTab = ({
  projectId,
  members,
  loading,
  editable,
  onAdd,
  onEdit,
}: ProjectMembersTabProps) => {
  const { modal } = App.useApp()
  const remove = useActionMutation({
    mutationFn: (member: ProjectMember) => removeProjectMember(projectId, member.userId),
    successMessage: '成员已移除',
    invalidateKeys: [PROJECTS_QUERY_KEY],
  })

  /**
   * 二次确认后移除成员
   * @param member - 待移除成员
   */
  const confirmRemove = (member: ProjectMember) =>
    modal.confirm({
      title: `将「${member.name}」移出项目？`,
      content: '移除后该成员将无法访问本项目数据，操作会记录在审计日志中。',
      okText: '移除',
      okButtonProps: { danger: true },
      onOk: () => remove.mutateAsync(member),
    })

  const columns: TableProps<ProjectMember>['columns'] = [
    { title: '成员', dataIndex: 'name', width: 110 },
    {
      title: '账号',
      dataIndex: 'account',
      render: (v: string) => <span className="font-mono text-[13px] text-fg-2">{v}</span>,
    },
    {
      title: '项目内角色',
      dataIndex: 'role',
      render: (v: ProjectMember['role']) => <EnumTag enumDef={ProjectMemberRole} value={v} />,
    },
    {
      title: '数据范围',
      dataIndex: 'dataScope',
      render: (v: ProjectMember['dataScope']) => DataScope.getLabel(v),
    },
    {
      title: '加入时间',
      dataIndex: 'joinedAt',
      width: 120,
      render: (v: string) => <span className="tabular-nums">{formatDate(v)}</span>,
    },
    {
      title: '最近活跃',
      dataIndex: 'lastActiveAt',
      width: 120,
      render: (v: string | null) => (
        <span className="tabular-nums">{formatDateTime(v, 'MM-DD HH:mm')}</span>
      ),
    },
    ...(editable
      ? [
          {
            title: '操作',
            key: 'actions',
            width: 120,
            render: (_: unknown, member: ProjectMember) => (
              <div className="-ms-2 flex">
                <Button type="link" size="small" onClick={() => onEdit(member)}>
                  编辑
                </Button>
                {member.role !== 'owner' && (
                  <Button type="link" size="small" danger onClick={() => confirmRemove(member)}>
                    移除
                  </Button>
                )}
              </div>
            ),
          },
        ]
      : []),
  ]

  return (
    <SectionCard
      title="成员列表"
      sub={`${members.length} 人`}
      extra={
        editable && (
          <Button size="small" type="primary" icon={<Plus size={14} />} onClick={onAdd}>
            添加成员
          </Button>
        )
      }
    >
      <Table<ProjectMember>
        rowKey="userId"
        size="small"
        columns={columns}
        dataSource={members}
        loading={loading}
        pagination={false}
        scroll={{ x: 800 }}
      />
      <Alert
        className="mt-3"
        type="info"
        showIcon
        title="成员在项目内的数据范围可单独设置，与用户的全局角色叠加生效：取两者中较窄的范围。"
      />
    </SectionCard>
  )
}
