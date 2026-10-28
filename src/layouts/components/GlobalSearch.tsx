import { SearchOutlined } from '@ant-design/icons'
import type { InputRef } from 'antd'
import { Input } from 'antd'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

/** 顶栏全局搜索框，支持 Ctrl/⌘ + K 快捷聚焦 */
export const GlobalSearch = () => {
  const { t } = useTranslation()
  const inputRef = useRef<InputRef>(null)

  useEffect(() => {
    /**
     * 监听快捷键聚焦搜索框
     * @param e - 键盘事件
     */
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <Input
      ref={inputRef}
      className="w-64"
      allowClear
      prefix={<SearchOutlined className="text-fg-3" />}
      suffix={
        <kbd className="rounded border border-line px-1 font-sans text-[11px] text-fg-3">
          Ctrl K
        </kbd>
      }
      placeholder={t('topbar.search.placeholder')}
    />
  )
}
