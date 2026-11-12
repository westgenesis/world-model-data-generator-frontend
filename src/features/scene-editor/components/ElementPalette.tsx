import { App } from 'antd'
import type { SceneElement } from '../constants/elements'
import { ELEMENT_DRAG_TYPE, SCENE_ELEMENTS } from '../constants/elements'
import { addElementAt } from '../hooks/scene-actions'
import { useSceneEditorStore } from '../stores/scene-editor-store'

const GROUPS = ['车辆', '弱势参与者', '障碍物'] as const

/** 元件库：拖到画布上放置，或单击放在视野中心 */
export const ElementPalette = () => {
  const { message } = App.useApp()
  const setUi = useSceneEditorStore((s) => s.setUi)

  /** 单击添加到视野中心 */
  const add = (element: SceneElement) => {
    const { viewCenter } = useSceneEditorStore.getState()
    try {
      addElementAt(element, viewCenter.x, viewCenter.y)
      setUi({ inspectorTab: 'entity' })
    } catch (e) {
      message.error(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="flex flex-col gap-4 p-3">
      <p className="text-xs leading-5 text-fg-3">拖到画布上放置，或单击添加到视野中心。</p>
      {GROUPS.map((group) => (
        <section key={group}>
          <h3 className="mb-1.5 text-xs font-medium text-fg-3">{group}</h3>
          <div className="grid grid-cols-2 gap-1.5">
            {SCENE_ELEMENTS.filter((e) => e.group === group).map((element) => {
              const Icon = element.icon
              return (
                <button
                  key={element.id}
                  type="button"
                  draggable
                  title={`${element.label} ${element.length}×${element.width} m`}
                  onDragStart={(e) => {
                    e.dataTransfer.setData(ELEMENT_DRAG_TYPE, element.id)
                    e.dataTransfer.effectAllowed = 'copy'
                  }}
                  onClick={() => add(element)}
                  className="group flex cursor-grab flex-col items-center gap-1 rounded-lg border border-line bg-card px-1 py-2 text-xs text-fg-2 transition-all hover:-translate-y-px hover:border-primary hover:text-primary hover:shadow-card focus-visible:outline-2 focus-visible:outline-primary active:cursor-grabbing"
                >
                  <Icon
                    size={20}
                    strokeWidth={1.6}
                    className="transition-transform group-hover:scale-110"
                  />
                  {element.label}
                  {!element.dynamic && <span className="text-[10px] text-fg-3">静态</span>}
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
