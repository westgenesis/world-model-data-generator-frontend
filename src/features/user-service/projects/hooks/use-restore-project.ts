import { App } from 'antd'
import type { Project } from '@/api/projects'
import { PROJECTS_QUERY_KEY, updateProject } from '@/api/projects'
import { useActionMutation } from '@/hooks/use-action-mutation'

/**
 * 恢复归档项目（二次确认），列表页与详情页共用
 * @returns 触发恢复的函数
 */
export const useRestoreProject = () => {
  const { modal } = App.useApp()
  const mutation = useActionMutation({
    mutationFn: (project: Project) => updateProject(project.id, { status: 'active' }),
    successMessage: '项目已恢复',
    invalidateKeys: [PROJECTS_QUERY_KEY],
  })

  return (project: Project) =>
    modal.confirm({
      title: `恢复项目「${project.name}」？`,
      content: '恢复后项目状态转为进行中。',
      okText: '恢复',
      onOk: () => mutation.mutateAsync(project),
    })
}
