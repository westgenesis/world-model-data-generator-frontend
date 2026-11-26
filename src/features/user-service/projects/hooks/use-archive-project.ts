import { App } from 'antd'
import type { Project } from '@/api/projects'
import { PROJECTS_QUERY_KEY, updateProject } from '@/api/projects'
import { useActionMutation } from '@/hooks/use-action-mutation'

/**
 * 归档项目（二次确认），列表页与详情页共用
 * @returns 触发归档的函数
 */
export const useArchiveProject = () => {
  const { modal } = App.useApp()
  const mutation = useActionMutation({
    mutationFn: (project: Project) => updateProject(project.id, { status: 'archived' }),
    successMessage: '项目已归档',
    invalidateKeys: [PROJECTS_QUERY_KEY],
  })

  return (project: Project) =>
    modal.confirm({
      title: `归档项目「${project.name}」？`,
      content: '归档后项目转为已归档状态。',
      okText: '归档',
      onOk: () => mutation.mutateAsync(project),
    })
}
