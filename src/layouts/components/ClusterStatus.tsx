import { Tooltip } from 'antd'
import { Cpu } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface ClusterStatusProps {
  /** 是否紧凑模式（侧栏收起时只显示图标） */
  compact?: boolean
}

/**
 * 算力集群状态卡片（当前为静态数据，后续接入监控接口）
 * @param props.compact - 是否紧凑模式
 */
export const ClusterStatus = ({ compact }: ClusterStatusProps) => {
  const { t } = useTranslation()
  const queued = 3

  const dot = (
    <span className="relative flex size-2">
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
      <span className="relative inline-flex size-2 rounded-full bg-success" />
    </span>
  )

  if (compact) {
    return (
      <Tooltip
        placement="right"
        title={`${t('topbar.cluster')} · ${t('topbar.clusterOk')} · ${t('topbar.queue', { count: queued })}`}
      >
        <div className="flex h-8 items-center justify-center">{dot}</div>
      </Tooltip>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-lg bg-sunken px-3 py-2.5">
      <span className="flex size-8 items-center justify-center rounded-md bg-card text-fg-2 shadow-card">
        <Cpu size={16} strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[13px] font-medium text-fg">
          {dot}
          {t('topbar.cluster')}
          <span className="font-normal text-success">{t('topbar.clusterOk')}</span>
        </div>
        <div className="text-xs text-fg-3">{t('topbar.queue', { count: queued })}</div>
      </div>
    </div>
  )
}
