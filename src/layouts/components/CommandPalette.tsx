import { useNavigate } from '@tanstack/react-router'
import type { InputRef } from 'antd'
import { Input, Modal } from 'antd'
import { CornerDownLeft, FileText, Search } from 'lucide-react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { NavLeaf } from '@/config/navigation'
import { NAV_LEAVES } from '@/config/navigation'

/** 是否为 macOS，用于显示 ⌘ 或 Ctrl */
const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

/**
 * 键盘按键提示
 * @param props.children - 按键文字
 */
const Kbd = ({ children }: { children: string }) => (
  <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-line bg-card px-1 font-sans text-[11px] text-fg-3">
    {children}
  </kbd>
)

/** 全局命令面板：⌘/Ctrl + K 打开，快速搜索并跳转到任意页面 */
export const CommandPalette = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const inputRef = useRef<InputRef>(null)
  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [active, setActive] = useState(0)

  useEffect(() => {
    /**
     * 监听快捷键打开命令面板
     * @param e - 键盘事件
     */
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const results = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return NAV_LEAVES.map((leaf) => ({
      leaf,
      label: t(leaf.node.labelKey),
      path: leaf.trail
        .slice(0, -1)
        .map((n) => t(n.labelKey))
        .join(' / '),
    })).filter(({ label, path }) => !kw || `${label} ${path}`.toLowerCase().includes(kw))
  }, [keyword, t])

  /**
   * 关闭面板并重置状态
   */
  const close = () => {
    setOpen(false)
    setKeyword('')
    setActive(0)
  }

  /**
   * 跳转到选中的页面
   * @param leaf - 目标页面
   */
  const go = (leaf: NavLeaf) => {
    close()
    void navigate({ to: leaf.node.to })
  }

  /**
   * 处理输入框内的上下选择与回车
   * @param e - 键盘事件
   */
  const onInputKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const delta = e.key === 'ArrowDown' ? 1 : -1
      setActive((i) => (i + delta + results.length) % Math.max(results.length, 1))
    } else if (e.key === 'Enter' && results[active]) {
      go(results[active].leaf)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden h-8.5 w-64 items-center gap-2 rounded-lg border border-line bg-sunken px-3 text-[13px] text-fg-3 transition-colors hover:border-line-strong lg:flex"
      >
        <Search size={15} strokeWidth={1.75} />
        <span className="flex-1 text-left">{t('topbar.search.placeholder')}</span>
        <Kbd>{IS_MAC ? '⌘K' : 'Ctrl K'}</Kbd>
      </button>

      <Modal
        open={open}
        onCancel={close}
        footer={null}
        closable={false}
        width={560}
        styles={{ container: { padding: 0, overflow: 'hidden' } }}
        afterOpenChange={(v) => v && inputRef.current?.focus()}
        destroyOnHidden
      >
        <div className="border-b border-line p-3">
          <Input
            ref={inputRef}
            autoFocus
            variant="borderless"
            size="large"
            prefix={<Search size={18} strokeWidth={1.75} className="mr-1 text-fg-3" />}
            placeholder={t('topbar.search.placeholder')}
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value)
              setActive(0)
            }}
            onKeyDown={onInputKeyDown}
          />
        </div>

        <div className="max-h-90 overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="py-10 text-center text-fg-3">{t('topbar.search.empty')}</div>
          ) : (
            <>
              <div className="px-2 py-1.5 text-xs text-fg-3">{t('topbar.search.pages')}</div>
              {results.map(({ leaf, label, path }, i) => (
                <button
                  key={leaf.node.key}
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(leaf)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left ${
                    i === active ? 'bg-primary-soft text-primary' : 'text-fg'
                  }`}
                >
                  <FileText size={16} strokeWidth={1.75} className="shrink-0 opacity-70" />
                  <span className="flex-1 truncate">{label}</span>
                  <span className="truncate text-xs text-fg-3">{path}</span>
                  {i === active && <CornerDownLeft size={14} className="shrink-0" />}
                </button>
              ))}
            </>
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-line bg-sunken px-4 py-2 text-xs text-fg-3">
          <span className="flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> {t('topbar.search.hintNavigate')}
          </span>
          <span className="flex items-center gap-1">
            <Kbd>↵</Kbd> {t('topbar.search.hintOpen')}
          </span>
          <span className="flex items-center gap-1">
            <Kbd>Esc</Kbd> {t('topbar.search.hintClose')}
          </span>
        </div>
      </Modal>
    </>
  )
}
