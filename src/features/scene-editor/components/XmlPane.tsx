import { xml } from '@codemirror/lang-xml'
import type { Diagnostic } from '@codemirror/lint'
import { lintGutter, setDiagnostics } from '@codemirror/lint'
import { EditorView } from '@codemirror/view'
import CodeMirror from '@uiw/react-codemirror'
import { Alert, Button, Segmented, Tag, Tooltip } from 'antd'
import { Check, Copy, RotateCcw, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useIsDark } from '@/hooks/use-is-dark'
import { serializeXml } from '../core/xml'
import type { DocKind } from '../stores/scene-editor-store'
import { useSceneEditorStore } from '../stores/scene-editor-store'

/** 某个文档的未应用草稿 */
interface Draft {
  text: string
  /** 草稿开始时的文档版本 */
  revision: number
}

/**
 * 从解析错误信息中提取行列号（Chrome / Firefox / jsdom 的格式不同）
 * @param message - 错误信息
 * @returns 行列号（从 1 开始）
 */
const errorPosition = (message: string) => {
  const m = /line[^\d]*(\d+)[^\d]+column[^\d]*(\d+)/i.exec(message) ?? /(\d+):(\d+)/.exec(message)
  return m ? { line: Number(m[1]), column: Number(m[2]) } : undefined
}

/**
 * XML 面板：预览并直接修改 xosc / xodr 文本。修改形成草稿，应用后替换文档（可撤销）
 */
export const XmlPane = () => {
  const isDark = useIsDark()
  const tab = useSceneEditorStore((s) => s.xmlTab)
  const xodr = useSceneEditorStore((s) => s.xodr)
  const xosc = useSceneEditorStore((s) => s.xosc)
  const revision = useSceneEditorStore((s) => s.revision)
  const focus = useSceneEditorStore((s) => s.xmlFocus)
  const replaceText = useSceneEditorStore((s) => s.replaceText)
  const setUi = useSceneEditorStore((s) => s.setUi)

  // 编辑器实例放在 state 中：懒加载完成后触发定位等副作用
  const [view, setView] = useState<EditorView>()
  const [drafts, setDrafts] = useState<Partial<Record<DocKind, Draft>>>({})
  const [error, setError] = useState<string>()

  const source = tab === 'xodr' ? xodr : xosc
  const docText = useMemo(() => (source ? serializeXml(source) : ''), [source])
  const draft = drafts[tab]
  const text = draft?.text ?? docText
  const stale = !!draft && draft.revision !== revision

  /** 清除错误标记 */
  const clearDiagnostics = useCallback(() => {
    if (view) view.dispatch(setDiagnostics(view.state, []))
    setError(undefined)
  }, [view])

  const discard = useCallback(() => {
    setDrafts((d) => ({ ...d, [tab]: undefined }))
    clearDiagnostics()
  }, [tab, clearDiagnostics])

  const apply = useCallback(() => {
    const current = useSceneEditorStore.getState()
    const d = drafts[current.xmlTab]
    if (!d) return
    try {
      replaceText(current.xmlTab, d.text)
      setDrafts((all) => ({ ...all, [current.xmlTab]: undefined }))
      clearDiagnostics()
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      setError(message)
      const pos = errorPosition(message)
      if (view) {
        const line = view.state.doc.line(
          Math.min(Math.max(pos?.line ?? 1, 1), view.state.doc.lines),
        )
        const from = Math.min(line.from + Math.max((pos?.column ?? 1) - 1, 0), line.to)
        const diagnostic: Diagnostic = {
          from,
          to: Math.max(from, line.to),
          severity: 'error',
          message: message.split('\n')[0],
        }
        view.dispatch(setDiagnostics(view.state, [diagnostic]))
        view.dispatch({
          selection: { anchor: from },
          effects: EditorView.scrollIntoView(from, { y: 'center' }),
        })
      }
    }
  }, [drafts, replaceText, clearDiagnostics, view])

  const extensions = useMemo(() => [xml(), lintGutter(), EditorView.lineWrapping], [])

  // 定位请求：选中第一个匹配文本并滚动到视野中央
  useEffect(() => {
    if (!focus || !view || focus.kind !== tab) return
    const index = view.state.doc.toString().indexOf(focus.needle)
    if (index < 0) return
    view.dispatch({
      selection: { anchor: index, head: index + focus.needle.length },
      effects: EditorView.scrollIntoView(index, { y: 'center' }),
    })
    view.focus()
  }, [focus, tab, view])

  const hasDoc = !!source

  return (
    <div
      className="flex h-full min-w-0 flex-col overflow-hidden"
      // ⌘S / Ctrl+S 在编辑器内应用修改（页面级快捷键会跳过编辑器内的按键）
      onKeyDownCapture={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
          e.preventDefault()
          apply()
        }
      }}
    >
      <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-line px-3 py-1.5">
        <Segmented<DocKind>
          size="small"
          value={tab}
          onChange={(v) => setUi({ xmlTab: v })}
          options={[
            { value: 'xosc', label: <span>OpenSCENARIO{drafts.xosc && ' •'}</span> },
            { value: 'xodr', label: <span>OpenDRIVE{drafts.xodr && ' •'}</span> },
          ]}
        />
        {draft && (
          <Tag color="orange" variant="filled" className="me-0!">
            未应用
          </Tag>
        )}
        <div className="ms-auto flex items-center gap-1">
          <Tooltip title="复制全文">
            <Button
              type="text"
              size="small"
              aria-label="复制全文"
              disabled={!hasDoc}
              icon={<Copy size={14} strokeWidth={1.75} />}
              onClick={() => void navigator.clipboard?.writeText(text)}
            />
          </Tooltip>
          <Tooltip title="放弃修改">
            <Button
              type="text"
              size="small"
              aria-label="放弃修改"
              disabled={!draft}
              icon={<RotateCcw size={14} strokeWidth={1.75} />}
              onClick={discard}
            />
          </Tooltip>
          <Tooltip title="应用到场景（⌘S / Ctrl+S）">
            <Button
              type="primary"
              size="small"
              disabled={!draft}
              icon={<Check size={14} strokeWidth={2} />}
              onClick={apply}
            >
              应用
            </Button>
          </Tooltip>
          <Tooltip title="关闭 XML 面板">
            <Button
              type="text"
              size="small"
              aria-label="关闭 XML 面板"
              icon={<X size={15} strokeWidth={1.75} />}
              onClick={() => setUi({ xmlOpen: false })}
            />
          </Tooltip>
        </div>
      </div>

      {stale && (
        <Alert
          type="warning"
          showIcon
          className="rounded-none! border-x-0! border-t-0! py-1.5! text-xs!"
          title="文档在画布中又被修改过，这份文本草稿基于旧版本。"
          action={
            <div className="flex gap-1">
              <Button size="small" onClick={discard}>
                放弃草稿
              </Button>
              <Button size="small" danger onClick={apply}>
                仍然应用
              </Button>
            </div>
          }
        />
      )}
      {error && (
        <Alert
          type="error"
          showIcon
          closable
          onClose={() => setError(undefined)}
          className="rounded-none! border-x-0! border-t-0! py-1.5! text-xs!"
          title={`无法应用：${error.split('\n')[0]}`}
        />
      )}

      <div className="min-h-0 flex-1 overflow-hidden">
        {hasDoc ? (
          <CodeMirror
            value={text}
            height="100%"
            className="h-full text-xs"
            theme={isDark ? 'dark' : 'light'}
            extensions={extensions}
            onCreateEditor={setView}
            onChange={(value) => {
              setDrafts((d) =>
                value === docText
                  ? { ...d, [tab]: undefined }
                  : { ...d, [tab]: { text: value, revision: d[tab]?.revision ?? revision } },
              )
            }}
            basicSetup={{ foldGutter: true, highlightActiveLine: true, searchKeymap: true }}
          />
        ) : (
          <p className="p-6 text-center text-xs text-fg-3">
            尚未加载 {tab === 'xodr' ? 'OpenDRIVE（.xodr）' : 'OpenSCENARIO（.xosc）'} 文件
          </p>
        )}
      </div>
    </div>
  )
}
