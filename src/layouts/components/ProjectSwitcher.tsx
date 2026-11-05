import { useQuery } from '@tanstack/react-query'
import type { MenuProps } from 'antd'
import { Dropdown } from 'antd'
import { ChevronsUpDown, FolderKanban, Layers } from 'lucide-react'
import { projectsQueryOptions } from '@/api/projects'
import { ALL_PROJECTS_ID, useAppStore } from '@/stores/app-store'

/** 顶栏项目切换器：切换后各列表只显示该项目的数据 */
export const ProjectSwitcher = () => {
  const { data: projects = [] } = useQuery(projectsQueryOptions)
  const currentProjectId = useAppStore((s) => s.currentProjectId)
  const setCurrentProject = useAppStore((s) => s.setCurrentProject)

  const current = projects.find((p) => p.id === currentProjectId)
  const isAll = !current

  /**
   * 渲染单个项目菜单项内容
   * @param name - 项目名称
   * @param desc - 辅助文字（项目 ID 等）
   */
  const renderItem = (name: string, desc: string) => (
    <div className="flex min-w-60 flex-col py-0.5">
      <span>{name}</span>
      <span className="text-xs text-fg-3">{desc}</span>
    </div>
  )

  const items: MenuProps['items'] = [
    {
      key: 'projects',
      type: 'group',
      label: '切换项目后，各列表只显示该项目的数据',
      children: projects.map((p) => ({
        key: p.id,
        icon: <FolderKanban size={16} strokeWidth={1.75} />,
        label: renderItem(p.name, p.id),
      })),
    },
    { type: 'divider' },
    {
      key: ALL_PROJECTS_ID,
      icon: <Layers size={16} strokeWidth={1.75} />,
      label: renderItem('全部项目', '汇总视图'),
    },
    { type: 'divider' },
    { key: 'footer', type: 'group', label: '项目由「用户服务管理 → 项目管理」维护' },
  ]

  return (
    <Dropdown
      trigger={['click']}
      menu={{
        items,
        selectable: true,
        selectedKeys: [current?.id ?? ALL_PROJECTS_ID],
        onClick: ({ key }) => setCurrentProject(key),
      }}
    >
      <button
        type="button"
        className="flex h-8.5 max-w-56 items-center gap-2 rounded-lg border border-line bg-card px-2.5 text-[13px] text-fg transition-colors hover:border-line-strong"
      >
        <span
          className={`flex size-5 shrink-0 items-center justify-center rounded ${
            isAll ? 'bg-purple-soft text-purple' : 'bg-primary-soft text-primary'
          }`}
        >
          {isAll ? <Layers size={13} /> : <FolderKanban size={13} />}
        </span>
        <span className="truncate">{current?.name ?? '全部项目'}</span>
        <ChevronsUpDown size={14} className="shrink-0 text-fg-3" />
      </button>
    </Dropdown>
  )
}
