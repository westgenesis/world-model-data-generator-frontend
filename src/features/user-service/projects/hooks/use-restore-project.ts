import { App } from 'antd'
import type { ProjectDetail } from '@/api/projects'
import { PROJECTS_QUERY_KEY, restoreProject } from '@/api/projects'
import { useActionMutation } from '@/hooks/use-action-mutation'

/**
 * 恢复已归档项目（二次确认），列表页与详情页共用
 * @returns 触发恢复的函数
 */
export const useRestoreProject = () => {
  const { modal } = App.useApp()
  const mutation = useActionMutation({
    mutationFn: (project: ProjectDetail) => restoreProject(project.id),
    successMessage: '项目已恢复',
    invalidateKeys: [PROJECTS_QUERY_KEY],
  })

  return (project: ProjectDetail) =>
    modal.confirm({
      title: `恢复项目「${project.name}」？`,
      content: '恢复后项目重新变为进行中，可继续新增任务与数据。',
      okText: '恢复',
      onOk: () => mutation.mutateAsync(project),
    })
}
