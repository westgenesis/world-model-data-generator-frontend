import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Badge, Button, Empty, Popover } from 'antd'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import type { LucideIcon } from 'lucide-react'
import { Bell, CircleAlert, CircleCheck, CircleX, Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Notification } from '@/api/notifications'
import { latestNotificationsQueryOptions } from '@/api/notifications'

dayjs.extend(relativeTime)

/** 消息级别对应的图标与配色 */
const LEVEL_STYLE: Record<Notification['level'], { icon: LucideIcon; className: string }> = {
  success: { icon: CircleCheck, className: 'bg-success-soft text-success' },
  warning: { icon: CircleAlert, className: 'bg-warning-soft text-warning' },
  danger: { icon: CircleX, className: 'bg-danger-soft text-danger' },
  info: { icon: Info, className: 'bg-primary-soft text-primary' },
}

/** 顶栏消息铃铛：展示最新消息，入口跳转消息中心 */
export const NotificationBell = () => {
  const { t } = useTranslation()
  const { data = [] } = useQuery(latestNotificationsQueryOptions)

  const content = (
    <div className="-mx-1 w-90">
      {data.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('topbar.notice.empty')} />
      ) : (
        <ul className="max-h-96 overflow-y-auto">
          {data.map((n) => {
            const { icon: Icon, className } = LEVEL_STYLE[n.level]
            return (
              <li key={n.id} className="flex gap-3 rounded-lg p-2.5 hover:bg-sunken">
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full ${className}`}
                >
                  <Icon size={16} strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <div className="text-[13px] leading-5 text-fg">{n.title}</div>
                  <div className="mt-0.5 text-xs text-fg-3">{n.description}</div>
                  <div className="mt-0.5 text-xs text-fg-3">{dayjs(n.createdAt).fromNow()}</div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <Link
        to="/user-service/messages"
        className="mt-1 block border-t border-line pt-2.5 text-center text-[13px] text-primary!"
      >
        {t('topbar.notice.viewAll')}
      </Link>
    </div>
  )

  return (
    <Popover
      trigger="click"
      placement="bottomRight"
      title={t('topbar.notice.title')}
      content={content}
    >
      <Badge count={data.length} size="small" offset={[-6, 6]}>
        <Button
          type="text"
          aria-label={t('topbar.notice.title')}
          icon={<Bell size={18} strokeWidth={1.75} />}
          className="text-fg-2!"
        />
      </Badge>
    </Popover>
  )
}
