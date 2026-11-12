import { getRouteApi, Link } from '@tanstack/react-router'
import { App, Button, Divider, Dropdown, Spin, Tooltip } from 'antd'
import { ArrowLeft, CodeXml, Download, FilePlus2, FileUp, Redo2, Save, Undo2 } from 'lucide-react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SceneCanvas } from './components/canvas/SceneCanvas'
import { ElementPalette } from './components/ElementPalette'
import { InspectorPanel } from './components/inspector/InspectorPanel'
import { Timeline } from './components/Timeline'
import { useEditorShortcuts } from './hooks/use-editor-shortcuts'
import { readDraft, useSceneIo } from './hooks/use-scene-io'
import type { PaneKind } from './stores/scene-editor-store'
import { useSceneEditorStore } from './stores/scene-editor-store'

const routeApi = getRouteApi('/scene-editor/$sceneId')

// CodeMirror 体积较大，打开 XML 面板时才加载
const XmlPane = lazy(() => import('./components/XmlPane').then((m) => ({ default: m.XmlPane })))

/**
 * 场景编辑器：导入 / 新建 OpenDRIVE + OpenSCENARIO，编辑目标物与轨迹，预览并修改 XML，导出。
 * 开发环境可通过 `?xodr=URL&xosc=URL` 直接加载。
 */
export const SceneEditorPage = () => {
  const { message } = App.useApp()
  const { sceneId } = routeApi.useParams()
  const search = routeApi.useSearch()
  const io = useSceneIo(sceneId)
  const { importFetched, importFiles, saveDraft, restoreDraft } = io
  const loaded = routeApi.useLoaderData()
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  // 本地草稿时间（仅在没有通过 URL 加载文件时提示）；用户恢复或忽略后隐藏
  const draftAt = useMemo(
    () => (search.xodr || search.xosc ? undefined : readDraft(sceneId)?.savedAt),
    [sceneId, search.xodr, search.xosc],
  )
  const [draftHandled, setDraftHandled] = useState(false)
  const [savedAt, setSavedAt] = useState<string>()
  const [xmlWidth, setXmlWidth] = useState(46)

  const xodr = useSceneEditorStore((s) => s.xodr)
  const xosc = useSceneEditorStore((s) => s.xosc)
  const sensors = useSceneEditorStore((s) => s.sensors)
  const dirty = useSceneEditorStore((s) => s.dirty)
  const canUndo = useSceneEditorStore((s) => s.past.length > 0)
  const canRedo = useSceneEditorStore((s) => s.future.length > 0)
  const undoLabel = useSceneEditorStore((s) => s.past.at(-1)?.label)
  const redoLabel = useSceneEditorStore((s) => s.future.at(-1)?.label)
  const xmlOpen = useSceneEditorStore((s) => s.xmlOpen)
  const undo = useSceneEditorStore((s) => s.undo)
  const redo = useSceneEditorStore((s) => s.redo)
  const setUi = useSceneEditorStore((s) => s.setUi)

  /** 统一处理异步操作的加载态与错误 */
  const run = useCallback(
    async (task: () => Promise<unknown> | unknown) => {
      setLoading(true)
      try {
        await task()
      } catch (e) {
        message.error(e instanceof Error ? e.message : String(e))
      } finally {
        setLoading(false)
      }
    },
    [message],
  )

  // 切换场景（或调试 URL）时重置状态，并导入路由 loader 预取的文件。
  // 同一场景只导入一次：loader 因失焦重新校验等原因再次返回数据时，不能覆盖用户的编辑
  const importedFor = useRef<string>(undefined)
  const sceneKey = `${sceneId}|${search.xodr ?? ''}|${search.xosc ?? ''}`
  useEffect(() => {
    if (importedFor.current === sceneKey) return
    importedFor.current = sceneKey
    useSceneEditorStore.getState().reset()
    if (loaded.error) message.error(loaded.error)
    try {
      importFetched(loaded.files)
      useSceneEditorStore.getState().markSaved()
    } catch (e) {
      message.error(e instanceof Error ? e.message : String(e))
    }
  }, [sceneKey, loaded, importFetched, message])

  const handleSave = useCallback(() => {
    if (saveDraft()) {
      setSavedAt(new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }))
      message.success('草稿已保存到本地浏览器')
    } else {
      message.error('保存失败：浏览器存储空间不足或已禁用')
    }
  }, [saveDraft, message])

  useEditorShortcuts(handleSave)

  /** 拖动分隔条调整 XML 面板宽度（百分比） */
  const handleSplitDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const container = e.currentTarget.parentElement
    if (!container) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const rect = container.getBoundingClientRect()
    const move = (ev: PointerEvent) =>
      setXmlWidth(Math.min(75, Math.max(25, ((rect.right - ev.clientX) / rect.width) * 100)))
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const empty = !xodr && !xosc
  const iconProps = { size: 15, strokeWidth: 1.75 }

  return (
    <div className="flex h-screen flex-col bg-card text-fg">
      <header className="flex h-11 shrink-0 items-center gap-1.5 border-b border-line px-2">
        <Link to="/data-gen/scene-resources">
          <Button type="text" size="small" icon={<ArrowLeft {...iconProps} />}>
            返回
          </Button>
        </Link>
        <Divider orientation="vertical" className="mx-1! h-5!" />
        <span className="text-sm font-semibold whitespace-nowrap">场景编辑器</span>
        <span className="hidden truncate text-xs text-fg-3 md:inline">{sceneId}</span>
        <span className="ms-2 text-xs whitespace-nowrap text-fg-3">
          {dirty ? (
            <span className="text-warning">● 未保存</span>
          ) : savedAt ? (
            `已保存 ${savedAt}`
          ) : (
            ''
          )}
        </span>

        <div className="ms-auto flex items-center gap-1">
          <Tooltip title={undoLabel ? `撤销：${undoLabel}（⌘Z）` : '撤销（⌘Z）'}>
            <Button
              type="text"
              size="small"
              aria-label="撤销"
              disabled={!canUndo}
              icon={<Undo2 {...iconProps} />}
              onClick={undo}
            />
          </Tooltip>
          <Tooltip title={redoLabel ? `重做：${redoLabel}（⌘⇧Z）` : '重做（⌘⇧Z）'}>
            <Button
              type="text"
              size="small"
              aria-label="重做"
              disabled={!canRedo}
              icon={<Redo2 {...iconProps} />}
              onClick={redo}
            />
          </Tooltip>
          <Divider orientation="vertical" className="mx-1! h-5!" />
          <input
            ref={inputRef}
            type="file"
            accept=".xodr,.xosc,.json"
            multiple
            hidden
            onChange={(e) => {
              const files = Array.from(e.target.files ?? [])
              e.target.value = ''
              void run(() => importFiles(files))
            }}
          />
          <Tooltip title="新建空白场景（引用当前路网）">
            <Button
              size="small"
              icon={<FilePlus2 {...iconProps} />}
              onClick={() => run(io.newScenario)}
            >
              新建场景
            </Button>
          </Tooltip>
          <Tooltip title="可同时选择 .xodr、.xosc 和传感器配置 .json，也可以直接拖到画布上">
            <Button
              size="small"
              icon={<FileUp {...iconProps} />}
              onClick={() => inputRef.current?.click()}
            >
              导入
            </Button>
          </Tooltip>
          <Dropdown
            disabled={empty}
            menu={{
              items: [
                { key: 'xosc', label: '导出场景 .xosc', disabled: !xosc },
                { key: 'xodr', label: '导出路网 .xodr', disabled: !xodr },
                { key: 'sensors', label: '导出传感器配置 .json', disabled: !sensors },
              ],
              onClick: ({ key }) => io.exportDoc(key as PaneKind),
            }}
          >
            <Button size="small" icon={<Download {...iconProps} />}>
              导出
            </Button>
          </Dropdown>
          <Tooltip title="保存草稿到本地浏览器（⌘S）">
            <Button
              size="small"
              disabled={empty}
              icon={<Save {...iconProps} />}
              onClick={handleSave}
            >
              保存
            </Button>
          </Tooltip>
          <Button
            size="small"
            type={xmlOpen ? 'primary' : 'default'}
            icon={<CodeXml {...iconProps} />}
            onClick={() => setUi({ xmlOpen: !xmlOpen })}
          >
            XML
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-48 shrink-0 flex-col border-r border-line">
          <ElementPalette />
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="relative flex min-h-0 flex-1">
            <div className="relative min-w-0 flex-1">
              <SceneCanvas onDropFiles={(files) => void run(() => importFiles(files))} />

              {empty && !loading && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="pointer-events-auto flex flex-col items-center gap-3 rounded-xl border border-dashed border-line-strong bg-card/90 px-10 py-8 text-center shadow-card backdrop-blur">
                    <FileUp size={28} strokeWidth={1.5} className="text-primary" />
                    <div>
                      <p className="text-sm font-medium">导入路网与场景</p>
                      <p className="mt-1 text-xs text-fg-3">拖入 .xodr / .xosc / .json 文件，或</p>
                    </div>
                    <div className="flex gap-2">
                      <Button type="primary" size="small" onClick={() => inputRef.current?.click()}>
                        选择文件
                      </Button>
                      <Button size="small" onClick={() => run(io.newScenario)}>
                        新建空白场景
                      </Button>
                    </div>
                    {draftAt && !draftHandled && (
                      <div className="mt-1 flex w-full items-center justify-between gap-3 rounded-lg bg-primary-soft px-3 py-2 text-xs text-fg-2">
                        <span>发现本地草稿（{new Date(draftAt).toLocaleString('zh-CN')}）</span>
                        <span className="flex gap-1">
                          <Button
                            size="small"
                            type="primary"
                            onClick={() =>
                              run(() => {
                                restoreDraft()
                                setDraftHandled(true)
                              })
                            }
                          >
                            恢复
                          </Button>
                          <Button size="small" onClick={() => setDraftHandled(true)}>
                            忽略
                          </Button>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-card/40">
                  <Spin />
                </div>
              )}
            </div>

            {xmlOpen && (
              <>
                <div
                  role="separator"
                  aria-orientation="vertical"
                  aria-label="调整 XML 面板宽度"
                  className="w-1 shrink-0 cursor-col-resize bg-line transition-colors hover:bg-primary"
                  onPointerDown={handleSplitDown}
                />
                <div className="min-w-0 shrink-0 bg-card" style={{ width: `${xmlWidth}%` }}>
                  <Suspense
                    fallback={
                      <div className="flex h-full items-center justify-center">
                        <Spin />
                      </div>
                    }
                  >
                    <XmlPane />
                  </Suspense>
                </div>
              </>
            )}
          </div>

          <div className="h-44 shrink-0 border-t border-line">
            <Timeline />
          </div>
        </main>

        <aside className="w-80 shrink-0 overflow-hidden border-l border-line">
          <InspectorPanel />
        </aside>
      </div>
    </div>
  )
}
