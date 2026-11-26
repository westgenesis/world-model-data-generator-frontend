import { useQuery } from '@tanstack/react-query'
import type { MenuProps } from 'antd'
import { Dropdown } from 'antd'
import { ChevronsUpDown, FolderKanban, Loader2, RefreshCw } from 'lucide-react'
import { useEffect } from 'react'
import { projectsQueryOptions } from '@/api/projects'
import { useAppStore } from '@/stores/app-store'

/** 顶栏项目切换器：维护全局「当前项目」上下文，始终选中一个项目 */
export const ProjectSwitcher = () => {
  const { data: projects = [], isPending, isError, refetch } = useQuery(projectsQueryOptions)
  const currentProjectId = useAppStore((s) => s.currentProjectId)
  const setCurrentProject = useAppStore((s) => s.setCurrentProject)

  /** 当前项目：优先匹配持久化的选择，未选择或已失效时默认选中第一个项目 */
  const current = projects.find((p) => String(p.id) === currentProjectId) ?? projects[0] ?? null

  /** 确保始终选中一个项目：持久化的选择失效时同步为第一个项目，列表为空时置空 */
  useEffect(() => {
    if (isPending || isError) return
    const valid = projects.some((p) => String(p.id) === currentProjectId)
    if (projects.length > 0 && !valid) {
      setCurrentProject(String(projects[0].id))
    } else if (projects.length === 0 && currentProjectId !== '') {
      setCurrentProject('')
    }
  }, [isPending, isError, projects, currentProjectId, setCurrentProject])

  /** 菜单项：加载中 / 加载失败 / 项目名称列表 */
  const projectItems: MenuProps['items'] = isPending
    ? [{ key: 'loading', label: '加载中…', disabled: true }]
    : isError
      ? [
          { key: 'load-error', label: '项目列表加载失败', disabled: true },
          { key: 'retry', icon: <RefreshCw size={16} strokeWidth={1.75} />, label: '重试加载' },
        ]
      : projects.length === 0
        ? [{ key: 'empty', label: '暂无项目', disabled: true }]
        : projects.map((p) => ({
            key: String(p.id),
            label: <span className="block max-w-44 truncate">{p.name}</span>,
          }))

  const items: MenuProps['items'] = [
    {
      key: 'projects',
      type: 'group',
      label: '选择当前项目',
      children: projectItems,
    },
  ]

  /** 按钮文案：加载中 / 当前项目名 / 暂无项目 */
  const label = isPending ? '加载中…' : (current?.name ?? '暂无项目')

  return (
    <Dropdown
      trigger={['click']}
      menu={{
        items,
        selectable: true,
        selectedKeys: current ? [String(current.id)] : [],
        style: { width: 208, maxHeight: 420, overflowY: 'auto' },
        onClick: ({ key }) => {
          if (key === 'retry') void refetch()
          else setCurrentProject(key)
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
