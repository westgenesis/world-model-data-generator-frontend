import { App } from 'antd'
import { useEffect } from 'react'
import { snapToFrame } from '../core/openscenario/motion'
import { useSceneEditorStore } from '../stores/scene-editor-store'
import { deleteEntity, deleteKeyframe } from './scene-actions'

/**
 * 是否正在文本输入（此时不响应单键快捷键）
 * @param target - 事件目标
 * @returns 是否为输入控件
 */
const isTyping = (target: EventTarget | null) => {
  const el = target as HTMLElement | null
  return (
    !!el &&
    (el.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) ||
      !!el.closest('.cm-editor'))
  )
}

/**
 * 编辑器快捷键：撤销重做、保存、播放、逐帧、删除、工具切换、适应视图
 * @param onSave - 保存草稿
 */
export const useEditorShortcuts = (onSave: () => void) => {
  const { modal } = App.useApp()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const s = useSceneEditorStore.getState()
      const mod = e.metaKey || e.ctrlKey
      const key = e.key.toLowerCase()

      if (mod && key === 's') {
        // XML 编辑器内由编辑器自己处理（应用修改）
        if ((e.target as HTMLElement | null)?.closest?.('.cm-editor')) return
        e.preventDefault()
        onSave()
        return
      }
      if (isTyping(e.target)) return
      if (mod && key === 'z') {
        e.preventDefault()
        if (e.shiftKey) s.redo()
        else s.undo()
        return
      }
      if (mod && key === 'y') {
        e.preventDefault()
        s.redo()
        return
      }
      if (mod || e.altKey) return

      switch (e.key) {
        case ' ':
          e.preventDefault()
          s.setUi({ playing: !s.playing })
          break
        case 'ArrowLeft':
        case 'ArrowRight': {
          e.preventDefault()
          const dir = e.key === 'ArrowLeft' ? -1 : 1
          s.setUi({ time: Math.max(0, snapToFrame(s.time + dir / s.fps, s.fps)), playing: false })
          break
        }
        case 'Delete':
        case 'Backspace': {
          if (!s.selected) return
          e.preventDefault()
          const name = s.selected
          if (s.selectedKey !== undefined && s.selectedKey > 0) {
            try {
              deleteKeyframe(name, s.selectedKey)
            } catch {
              // 导入轨迹至少保留两点，忽略
            }
            return
          }
          modal.confirm({
            title: `删除 ${name}？`,
            content: '可通过撤销（⌘Z）恢复。',
            okText: '删除',
            okButtonProps: { danger: true },
            onOk: () => {
              deleteEntity(name)
            },
          })
          break
        }
        case 'Escape':
          if (s.tool !== 'select') s.setUi({ tool: 'select' })
          else s.select(undefined)
          break
        case 'v':
        case 'V':
          s.setUi({ tool: 'select' })
          break
        case 'h':
        case 'H':
          s.setUi({ tool: 'pan' })
          break
        case 'd':
        case 'D':
          s.setUi({ tool: 'draw' })
          break
        case 'f':
        case 'F':
          s.setUi({ fitRequest: s.fitRequest + 1 })
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onSave, modal])
}
