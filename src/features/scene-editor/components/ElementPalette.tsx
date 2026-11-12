import { App, Input, Tooltip } from 'antd'
import { ChevronRight, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ElementGroup, SceneElement } from '../constants/elements'
import {
  ELEMENT_DRAG_TYPE,
  ELEMENT_GROUPS,
  SCENE_ELEMENTS,
  UPGRADE_NOTICE,
} from '../constants/elements'
import { addElementAt } from '../hooks/scene-actions'
import { useSceneEditorStore } from '../stores/scene-editor-store'
import { Hint } from './inspector/fields'

/**
 * 元件是否匹配搜索词（名称、类别、角色、关键字，不区分大小写）
 * @param element - 元件
 * @param keyword - 已转小写并去除首尾空白的搜索词
 * @returns 是否匹配
 */
const matches = (element: SceneElement, keyword: string) =>
  [element.label, element.category, element.role, element.keywords]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(keyword)

/** 元件库：搜索、按分组折叠；拖到画布上放置，或单击放在视野中心 */
export const ElementPalette = () => {
  const { message } = App.useApp()
  const setUi = useSceneEditorStore((s) => s.setUi)
  const [keyword, setKeyword] = useState('')
  const [collapsed, setCollapsed] = useState<ReadonlySet<ElementGroup>>(new Set())

  const kw = keyword.trim().toLowerCase()
  const groups = useMemo(
    () =>
      ELEMENT_GROUPS.map((group) => ({
        group,
        items: SCENE_ELEMENTS.filter((e) => e.group === group && (!kw || matches(e, kw))),
      })).filter((g) => g.items.length > 0),
    [kw],
  )

  /** 单击添加到视野中心 */
  const add = (element: SceneElement) => {
    const { viewCenter } = useSceneEditorStore.getState()
    try {
      const result = addElementAt(element, viewCenter.x, viewCenter.y)
      if (result.upgraded) message.info(UPGRADE_NOTICE)
      if (result.autoEgo) message.info(`「${result.name}」已设为自车`)
      setUi({ inspectorTab: 'entity' })
    } catch (e) {
      message.error(e instanceof Error ? e.message : String(e))
    }
  }

  /** 折叠 / 展开分组 */
  const toggle = (group: ElementGroup) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-2 border-b border-line p-3">
        <h2 className="flex items-center gap-1 text-xs font-medium text-fg-2">
          元件库
          <Hint title="拖到画布上放置，或单击添加到视野中心；带 1.2 标记的元件需要 OpenSCENARIO 1.2" />
        </h2>
        <Input
          size="small"
          allowClear
          prefix={<Search size={14} className="text-fg-3" />}
          placeholder="搜索元件"
          aria-label="搜索元件"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2">
        {groups.length === 0 && (
          <p className="px-1 py-6 text-center text-xs text-fg-3">没有匹配的元件</p>
        )}
        {groups.map(({ group, items }) => {
          // 搜索时始终展开有结果的分组
          const open = Boolean(kw) || !collapsed.has(group)
          return (
            <section key={group}>
              <button
                type="button"
                aria-expanded={open}
                onClick={() => toggle(group)}
                disabled={Boolean(kw)}
                className="flex w-full items-center gap-1 rounded px-1 py-1 text-xs font-medium text-fg-3 transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-default disabled:hover:text-fg-3"
              >
                <ChevronRight
                  size={13}
                  className={`shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
                />
                {group}
                <span className="ms-auto font-normal tabular-nums">{items.length}</span>
              </button>
              {open && (
                <div className="mt-1 mb-2 grid grid-cols-2 gap-1.5 px-1">
                  {items.map((element) => (
                    <PaletteItem key={element.id} element={element} onAdd={add} />
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}

/**
 * 单个元件：可拖拽、可单击添加
 * @param props.element - 元件
 * @param props.onAdd - 单击时添加
 */
const PaletteItem = ({
  element,
  onAdd,
}: {
  element: SceneElement
  onAdd: (element: SceneElement) => void
}) => {
  const Icon = element.icon
  const item = (
    <button
      type="button"
      draggable
      title={`${element.label} ${element.length}×${element.width} m`}
      onDragStart={(e) => {
        e.dataTransfer.setData(ELEMENT_DRAG_TYPE, element.id)
        e.dataTransfer.effectAllowed = 'copy'
      }}
      onClick={() => onAdd(element)}
      className="group relative flex w-full cursor-grab flex-col items-center gap-1 rounded-lg border border-line bg-card px-1 py-2 text-xs text-fg-2 transition-all hover:-translate-y-px hover:border-primary hover:text-primary hover:shadow-card focus-visible:outline-2 focus-visible:outline-primary active:cursor-grabbing"
    >
      {element.role && (
        <span className="absolute top-0.5 right-1 text-[9px] leading-none font-medium text-fg-3">
          1.2
        </span>
      )}
      <Icon size={20} strokeWidth={1.6} className="transition-transform group-hover:scale-110" />
      <span className="max-w-full truncate">{element.label}</span>
    </button>
  )
  return element.role ? (
    <Tooltip title="需要 OpenSCENARIO 1.2，旧版本场景会自动升级" mouseEnterDelay={0.4}>
      {item}
    </Tooltip>
  ) : (
    item
  )
}
