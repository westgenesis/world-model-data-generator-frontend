import { Construction } from 'lucide-react'
import type { ReactNode } from 'react'
import { PageHeader } from './PageHeader'

interface PlaceholderPageProps {
  /** 页面标题 */
  title: ReactNode
}

/**
 * 占位页面，用于尚未实现的业务页面
 * @param props.title - 页面标题
 */
export const PlaceholderPage = ({ title }: PlaceholderPageProps) => {
  return (
    <>
      <PageHeader title={title} />
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line-strong bg-card px-6 py-24 text-center shadow-card">
        <span className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Construction size={24} strokeWidth={1.75} />
        </span>
        <div className="text-base font-medium text-fg">页面开发中</div>
        <p className="mt-1 max-w-md text-fg-3">
          该页面尚未实现，可参考 docs/原型 中对应的原型文件。
        </p>
      </div>
    </>
  )
}
