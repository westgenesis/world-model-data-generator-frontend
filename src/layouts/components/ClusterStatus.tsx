import { Tooltip } from 'antd'
import { Cpu } from 'lucide-react'

interface ClusterStatusProps {
  /** 是否紧凑模式（侧栏收起时只显示图标） */
  compact?: boolean
}

/**
 * 算力集群状态卡片（当前为静态数据，后续接入监控接口）
 * @param props.compact - 是否紧凑模式
 */
export const ClusterStatus = ({ compact }: ClusterStatusProps) => {
  const queued = 3

  const dot = (
    <span className="relative flex size-2">
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
      <span className="relative inline-flex size-2 rounded-full bg-success" />
    </span>
  )

  if (compact) {
    return (
      <Tooltip placement="right" title={`算力集群 · 运行正常 · 排队任务 ${queued} 个`}>
        <div className="flex h-8 items-center justify-center">{dot}</div>
      </Tooltip>
    )
  }

  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-sunken px-2.5 py-1.5">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-card text-fg-2 shadow-card">
        <Cpu size={15} strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[13px] leading-5 font-medium whitespace-nowrap text-fg">
          {dot}
          算力集群
          <span className="font-normal text-success">运行正常</span>
        </div>
        <div className="text-xs leading-4 text-fg-3">排队任务 {queued} 个</div>
      </div>
    </div>
  )
}
