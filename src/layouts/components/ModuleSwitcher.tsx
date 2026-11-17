import { useLocation, useNavigate } from '@tanstack/react-router'
import { Popover, Tooltip } from 'antd'
import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { AppPath } from '@/config/navigation'
import { firstLeafOf, flattenLeaves, moduleOf, NAV_LEAVES, NAV_MODULES } from '@/config/navigation'
import { useAppStore } from '@/stores/app-store'
import { MODULE_ACCENT } from './module-accent'

/** 模块条目：模块节点与页面数量，结构静态、渲染前预计算 */
const MODULE_ENTRIES = NAV_MODULES.map((module) => ({
  module,
  count: flattenLeaves(module.children ?? []).length,
}))

/**
 * 侧栏模块切换器：下拉选择模块后跳转到该模块页面，侧栏随之只显示该模块的导航；
 * 各模块会记住本次会话内最后浏览的页面。收起态下只显示当前模块图标，面板从右侧弹出
 */
export const ModuleSwitcher = () => {
  const navigate = useNavigate()
  const pathname = useLocation({ select: (l) => l.pathname })
  const collapsed = useAppStore((s) => s.sidebarCollapsed)
  const [open, setOpen] = useState(false)
  const lastPathRef = useRef<Record<string, string>>({})

  const activeModule = moduleOf(pathname) ?? NAV_MODULES[0]
  const ActiveIcon = activeModule.icon
  const activeAccent = MODULE_ACCENT[activeModule.accent ?? 'primary']
  const activeEntry =
    MODULE_ENTRIES.find((entry) => entry.module.key === activeModule.key) ?? MODULE_ENTRIES[0]

  useEffect(() => {
    const current = moduleOf(pathname)
    if (current) lastPathRef.current[current.key] = pathname
  }, [pathname])

  /**
   * 切换模块：优先回到该模块上次浏览的页面，否则进入其第一个页面
   * @param key - 目标模块 key
   */
  const selectModule = (key: string) => {
    setOpen(false)
    if (key === activeModule.key) return
    const target = NAV_MODULES.find((module) => module.key === key)
    const to = lastPathRef.current[key] ?? (target ? firstLeafOf(target)?.to : undefined)
    if (to) void navigate({ to: to as AppPath })
  }

  const panel = (
    <div className="w-84 max-w-[calc(100vw-32px)]">
      <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
        <span className="text-[11px] font-semibold tracking-[0.08em] text-fg-3">切换模块</span>
        <span className="text-[11px] text-fg-3">共 {NAV_LEAVES.length} 个页面</span>
      </div>

      <div className="space-y-0.5 p-1.5">
        {MODULE_ENTRIES.map(({ module, count }) => {
          const Icon = module.icon
          const accent = MODULE_ACCENT[module.accent ?? 'primary']
          const isActive = module.key === activeModule.key

          return (
            <button
              key={module.key}
              type="button"
              aria-current={isActive ? 'true' : undefined}
              onClick={() => selectModule(module.key)}
              className={`group flex w-full items-start gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${
                isActive ? accent.active : 'hover:bg-sunken'
              }`}
            >
              <span
                className={`mt-px flex size-9 shrink-0 items-center justify-center rounded-lg shadow-card transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none ${
                  accent.tile
                }`}
              >
                {Icon ? <Icon size={18} strokeWidth={1.8} /> : null}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-[13px] font-medium text-fg">{module.label}</span>
                  <span className="ml-auto shrink-0 text-[11px] text-fg-3">{count} 个页面</span>
                  {isActive ? (
                    <Check size={14} strokeWidth={2.5} className={`shrink-0 ${accent.text}`} />
                  ) : null}
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-fg-3">
                  {module.description}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="border-t border-line bg-sunken px-3.5 py-2 text-[11px] leading-4 text-fg-3">
        切换后，下方导航只显示当前模块的功能页面
      </div>
    </div>
  )

  const trigger = collapsed ? (
    <button
      type="button"
      aria-label={`切换模块，当前为${activeModule.label}`}
      className="group mx-auto flex size-10 cursor-pointer items-center justify-center rounded-lg border border-line bg-sunken transition-colors hover:border-line-strong hover:bg-card focus-visible:outline-2 focus-visible:outline-primary"
    >
      <span
        className={`flex size-6 items-center justify-center rounded-md transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none ${
          activeAccent.tile
        }`}
      >
        {ActiveIcon ? <ActiveIcon size={14} strokeWidth={2} /> : null}
      </span>
    </button>
  ) : (
    <button
      type="button"
      aria-label={`切换模块，当前为${activeModule.label}`}
      className="group flex h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg border border-line bg-sunken px-2.5 text-left transition-colors hover:border-line-strong hover:bg-card focus-visible:outline-2 focus-visible:outline-primary"
    >
      <span
        className={`flex size-7 shrink-0 items-center justify-center rounded-md shadow-card transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none ${
          activeAccent.tile
        }`}
      >
        {ActiveIcon ? <ActiveIcon size={15} strokeWidth={1.9} /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] leading-5 font-semibold text-fg">
          {activeModule.label}
        </span>
        <span className="block truncate text-[11px] leading-4 text-fg-3">
          切换模块 · {activeEntry.count} 个页面
        </span>
      </span>
      <ChevronDown
        size={14}
        className={`shrink-0 text-fg-3 transition-transform duration-200 motion-reduce:transition-none ${
          open ? 'rotate-180' : ''
        }`}
      />
    </button>
  )

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement={collapsed ? 'rightTop' : 'bottomLeft'}
      arrow={false}
      content={panel}
      styles={{ container: { padding: 0 }, content: { padding: 0 } }}
    >
      {collapsed ? (
        <Tooltip title="切换模块" placement="right" open={open ? false : undefined}>
          {trigger}
        </Tooltip>
      ) : (
        trigger
      )}
    </Popover>
  )
}
