import { DownOutlined, FolderOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import type { MenuProps } from 'antd'
import { Button, Dropdown } from 'antd'
import { useTranslation } from 'react-i18next'
import { projectsQueryOptions } from '@/api/projects'
import { ALL_PROJECTS_ID, useAppStore } from '@/stores/app-store'

/** 顶栏项目切换器：切换后各列表只显示该项目的数据 */
export const ProjectSwitcher = () => {
  const { t } = useTranslation()
  const { data: projects = [] } = useQuery(projectsQueryOptions)
  const currentProjectId = useAppStore((s) => s.currentProjectId)
  const setCurrentProject = useAppStore((s) => s.setCurrentProject)

  const currentName =
    projects.find((p) => p.id === currentProjectId)?.name ?? t('topbar.project.all')

  /**
   * 渲染单个项目菜单项内容
   * @param name - 项目名称
   * @param desc - 右侧辅助文字（项目 ID 等）
   */
  const renderItem = (name: string, desc: string) => (
    <div className="flex min-w-64 items-center justify-between gap-4">
      <span>{name}</span>
      <span className="text-[11px] text-fg-3">{desc}</span>
    </div>
  )

  const items: MenuProps['items'] = [
    { key: 'hint', type: 'group', label: t('topbar.project.hint') },
    ...projects.map((p) => ({ key: p.id, label: renderItem(p.name, p.id) })),
    {
      key: ALL_PROJECTS_ID,
      label: renderItem(t('topbar.project.all'), t('topbar.project.allDesc')),
    },
    { type: 'divider' },
    { key: 'footer', type: 'group', label: t('topbar.project.footer') },
  ]

  return (
    <Dropdown
      trigger={['click']}
      menu={{
        items,
        selectable: true,
        selectedKeys: [currentProjectId],
        onClick: ({ key }) => setCurrentProject(key),
      }}
    >
      <Button icon={<FolderOutlined />}>
        <span className="max-w-40 truncate">{currentName}</span>
        <DownOutlined className="text-[10px] text-fg-3" />
      </Button>
    </Dropdown>
  )
}
