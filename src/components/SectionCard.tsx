import type { ReactNode } from 'react'

interface SectionCardProps {
  /** 区块标题 */
  title?: ReactNode
  /** 标题旁的辅助说明 */
  sub?: ReactNode
  /** 标题栏右侧操作 */
  extra?: ReactNode
  /** 内容 */
  children: ReactNode
  className?: string
}

/**
 * 内容区块卡片：可选标题栏 + 内容
 * @param props - 标题、说明、操作与内容
 */
export const SectionCard = ({ title, sub, extra, children, className = '' }: SectionCardProps) => (
  <section className={`rounded-xl border border-line bg-card p-5 shadow-card ${className}`}>
    {(title || extra) && (
      <div className="mb-3 flex items-center gap-3">
        <h2 className="text-[15px] font-semibold text-fg">
          {title}
          {sub && <span className="ms-2 text-xs font-normal text-fg-3">{sub}</span>}
        </h2>
        {extra && <div className="ms-auto flex items-center gap-2">{extra}</div>}
      </div>
    )}
    {children}
  </section>
)
