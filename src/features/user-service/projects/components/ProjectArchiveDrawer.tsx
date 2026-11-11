import { useQuery } from '@tanstack/react-query'
import { Alert, Descriptions, Form, Input, Skeleton } from 'antd'
import type { ProjectDetail } from '@/api/projects'
import {
  archiveProject,
  projectArchiveImpactQueryOptions,
  PROJECTS_QUERY_KEY,
} from '@/api/projects'
import { FormDrawer } from '@/components/FormDrawer'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { formatNumber } from '@/lib/format'

interface ProjectArchiveDrawerProps {
  open: boolean
  project?: ProjectDetail
  onClose: () => void
}

/**
 * 归档项目抽屉：展示归档影响，并要求输入项目名称以确认
 * @param props - 打开状态、待归档项目与关闭回调
 */
export const ProjectArchiveDrawer = ({ open, project, onClose }: ProjectArchiveDrawerProps) => {
  const { data: impact, isPending } = useQuery({
    ...projectArchiveImpactQueryOptions(project?.id ?? ''),
    enabled: open && Boolean(project),
  })

  const mutation = useActionMutation({
    mutationFn: () => archiveProject(project!.id),
    successMessage: '项目已归档',
    invalidateKeys: [PROJECTS_QUERY_KEY],
    onSuccess: onClose,
  })

  return (
    <FormDrawer<{ confirmName: string }>
      open={open}
      title={`归档项目 · ${project?.name ?? ''}`}
      onClose={onClose}
      onSubmit={() => mutation.mutate()}
      submitting={mutation.isPending}
      submitText="确认归档"
      header={
        <>
          <Alert
            type="warning"
            showIcon
            title="归档后项目内的任务不再新增，已有数据保留可查；需要时可恢复。"
          />
          <h3 className="mt-4 mb-2 font-semibold text-fg">归档影响</h3>
          {isPending || !impact ? (
            <Skeleton active paragraph={{ rows: 3 }} title={false} />
          ) : (
            <Descriptions
              column={1}
              size="small"
              bordered
              items={[
                {
                  key: 'tasks',
                  label: '在跑任务',
                  children: `${impact.runningTaskCount} 个（将继续执行至结束）`,
                },
                {
                  key: 'members',
                  label: '项目成员',
                  children: `${impact.memberCount} 人（保留成员关系）`,
                },
                {
                  key: 'data',
                  label: '已有数据',
                  children: `${formatNumber(impact.dataSizeTb, 1)} TB（保留，可导出）`,
                },
                {
                  key: 'datasets',
                  label: '关联数据集',
                  children: `${impact.datasetCount} 个（不变）`,
                },
              ]}
            />
          )}
        </>
      }
    >
      <Form.Item
        name="confirmName"
        label="请输入项目名称以确认"
        required
        className="mt-4 sm:col-span-2"
        rules={[
          {
            validator: async (_, value?: string) => {
              if (value?.trim() !== project?.name) throw new Error('项目名称不一致')
            },
          },
        ]}
      >
        <Input placeholder={project?.name} autoComplete="off" />
      </Form.Item>
    </FormDrawer>
  )
}
