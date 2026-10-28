import { BellOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Badge, Button, Empty, Popover } from 'antd'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useTranslation } from 'react-i18next'
import type { Notification } from '@/api/notifications'
import { latestNotificationsQueryOptions } from '@/api/notifications'

dayjs.extend(relativeTime)

/** 消息级别对应的圆点颜色 */
const LEVEL_COLOR: Record<Notification['level'], string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-primary',
}

/** 顶栏消息铃铛：展示最新消息，入口跳转消息中心 */
export const NotificationBell = () => {
  const { t } = useTranslation()
  const { data = [] } = useQuery(latestNotificationsQueryOptions)

  const content = (
    <div className="w-80">
      {data.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('topbar.notice.empty')} />
      ) : (
        <ul className="max-h-90 overflow-y-auto">
          {data.map((n) => (
            <li key={n.id} className="flex gap-2.5 rounded-sm px-2 py-2 hover:bg-page">
              <span className={`mt-2 size-1.5 shrink-0 rounded-full ${LEVEL_COLOR[n.level]}`} />
              <div className="min-w-0">
                <div className="text-fg">{n.title}</div>
                <div className="text-xs text-fg-3">
                  {n.description} · {dayjs(n.createdAt).fromNow()}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Link
        to="/user-service/messages"
        className="mt-1 block border-t border-line pt-2 text-center text-primary"
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
      <Badge count={data.length} size="small" offset={[-4, 4]}>
        <Button type="text" icon={<BellOutlined className="text-base" />} />
      </Badge>
    </Popover>
  )
}
