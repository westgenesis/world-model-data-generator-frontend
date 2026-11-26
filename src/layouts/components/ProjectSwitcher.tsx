import { useQuery } from '@tanstack/react-query'
import type { MenuProps } from 'antd'
import { Dropdown } from 'antd'
import { ChevronsUpDown, FolderKanban, Loader2, RefreshCw } from 'lucide-react'
import { useEffect } from 'react'
import { projectsQueryOptions } from '@/api/projects'
import { useAppStore } from '@/stores/app-store'

/** 「全部项目」菜单项 key；选中时 currentProjectId 为空字符串（不按项目筛选） */
const ALL_PROJECTS_KEY = 'all'

/** 顶栏项目切换器：维护全局「当前项目」上下文；「全部项目」表示不按项目筛选 */
export const ProjectSwitcher = () => {
  const { data: projects = [], isPending, isError, refetch } = useQuery(projectsQueryOptions)
  const currentProjectId = useAppStore((s) => s.currentProjectId)
  const setCurrentProject = useAppStore((s) => s.setCurrentProject)

  /** 当前项目：空字符串表示「全部项目」；持久化的失效 ID 由下方 effect 重置 */
  const current = projects.find((p) => String(p.id) === currentProjectId) ?? null

  /** 持久化的项目已失效时（非空但列表中不存在）重置为「全部项目」，避免残留失效 ID */
  useEffect(() => {
    if (isPending || isError) return
    if (currentProjectId !== '' && !projects.some((p) => String(p.id) === currentProjectId)) {
      setCurrentProject('')
    }
  }, [isPending, isError, projects, currentProjectId, setCurrentProject])

  /** 菜单项：加载中 / 加载失败 / 「全部项目」+ 项目名称列表 */
  const projectItems: MenuProps['items'] = isPending
    ? [{ key: 'loading', label: '加载中…', disabled: true }]
    : isError
      ? [
          { key: 'load-error', label: '项目列表加载失败', disabled: true },
          { key: 'retry', icon: <RefreshCw size={16} strokeWidth={1.75} />, label: '重试加载' },
        ]
      : [
          { key: ALL_PROJECTS_KEY, label: '全部项目' },
          ...projects.map((p) => ({
            key: String(p.id),
            label: <span className="block max-w-44 truncate">{p.name}</span>,
          })),
        ]

  const items: MenuProps['items'] = [
    {
      key: 'projects',
      type: 'group',
      label: '选择当前项目',
      children: projectItems,
    },
  ]

  /** 按钮文案：加载中 / 当前项目名 / 全部项目 */
  const label = isPending ? '加载中…' : (current?.name ?? '全部项目')

  return (
    <Dropdown
      trigger={['click']}
      menu={{
        items,
        selectable: true,
        selectedKeys: [current ? String(current.id) : ALL_PROJECTS_KEY],
        style: { width: 208, maxHeight: 420, overflowY: 'auto' },
        onClick: ({ key }) => {
          if (key === 'retry') void refetch()
          else setCurrentProject(key === ALL_PROJECTS_KEY ? '' : key)
        },
      }}
    >
      <button
        type="button"
        aria-label={`当前项目：${label}`}
        className="group flex h-8.5 w-40 items-center gap-2 rounded-lg border border-line bg-card px-2.5 text-[13px] text-fg transition-colors hover:border-line-strong hover:bg-sunken"
      >
        <span className="flex size-5 shrink-0 items-center justify-center rounded bg-primary-soft text-primary">
          {isPending ? <Loader2 size={13} className="animate-spin" /> : <FolderKanban size={13} />}
        </span>
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        <ChevronsUpDown
          size={14}
          className="shrink-0 text-fg-3 transition-colors group-hover:text-fg-2"
        />
      </button>
    </Dropdown>
  )
}
