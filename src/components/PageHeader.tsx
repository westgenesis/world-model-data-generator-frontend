import type { ReactNode } from 'react'

interface PageHeaderProps {
  /** 页面标题 */
  title: ReactNode
  /** 标题下方的说明文字 */
  description?: ReactNode
  /** 右侧操作区 */
  extra?: ReactNode
}

/**
 * 页面标题栏，样式对应原型中的 page-head
 * @param props - 标题、说明与操作区
 */
export const PageHeader = ({ title, description, extra }: PageHeaderProps) => (
  <div className="mb-4 flex items-start gap-4">
    <div className="min-w-0 flex-1">
      <h1 className="text-lg leading-7 font-semibold text-fg">{title}</h1>
      {description && <p className="mt-0.5 text-fg-2">{description}</p>}
    </div>
    {extra && <div className="flex shrink-0 items-center gap-2">{extra}</div>}
  </div>
)
