import { App } from 'antd'
import type { Project } from '@/api/projects'
import { deleteProject, PROJECTS_QUERY_KEY } from '@/api/projects'
import { useActionMutation } from '@/hooks/use-action-mutation'

/**
 * 删除项目（二次确认），列表页与详情页共用
 * @returns 触发删除的函数
 */
export const useDeleteProject = () => {
  const { modal } = App.useApp()
  const mutation = useActionMutation({
    mutationFn: (project: Project) => deleteProject(project.id),
    successMessage: '项目已删除',
    invalidateKeys: [PROJECTS_QUERY_KEY],
  })

  return (project: Project) =>
    modal.confirm({
      title: `删除项目「${project.name}」？`,
      content: '删除后不可恢复，请谨慎操作。',
      okText: '删除',
      okButtonProps: { danger: true },
      onOk: () => mutation.mutateAsync(project),
    })
}
