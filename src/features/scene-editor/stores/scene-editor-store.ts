import { create } from 'zustand'
import { parseOpenDrive } from '../core/opendrive/parse'
import { parseOpenScenario } from '../core/openscenario/parse'
import type { XmlSource } from '../core/xml'
import { parseXml } from '../core/xml'

/** 文档类型 */
export type DocKind = 'xodr' | 'xosc'

/** 画布工具 */
export type CanvasTool = 'select' | 'pan' | 'draw'

/** 图层开关 */
export interface Layers {
  lanes: boolean
  marks: boolean
  entities: boolean
  trajectories: boolean
  labels: boolean
}

/** 历史快照：两份文档的引用（未修改的文档共享同一对象） */
interface Snapshot {
  xodr?: XmlSource
  xosc?: XmlSource
  label: string
}

/** 右侧面板标签 */
export type InspectorTab = 'entity' | 'scene' | 'validate'

/** 撤销栈上限 */
const HISTORY_LIMIT = 100

interface SceneEditorState {
  xodr?: XmlSource
  xosc?: XmlSource
  xodrName: string
  xoscName: string
  /** 撤销 / 重做栈 */
  past: Snapshot[]
  future: Snapshot[]
  /** 自上次保存后是否有修改 */
  dirty: boolean
  /** 每次文档变化递增，供 XML 面板判断草稿是否过期 */
  revision: number

  selected?: string
  /** 选中实体的关键帧下标 */
  selectedKey?: number
  /** 播放头（秒） */
  time: number
  playing: boolean
  rate: number
  fps: number
  /** 时间轴显示时长（秒） */
  duration: number
  tool: CanvasTool
  layers: Layers
  snapToLane: boolean
  autoKey: boolean
  xmlOpen: boolean
  xmlTab: DocKind
  /** 绘制轨迹时的速度（m/s） */
  drawSpeed: number
  /** 画布视野中心（世界坐标），用于单击元件时的放置位置 */
  viewCenter: { x: number; y: number }
  inspectorTab: InspectorTab
  /** 请求画布适应全部内容（递增触发） */
  fitRequest: number
  /** 请求画布平移到某个实体（nonce 用于重复触发） */
  canvasFocus?: { name: string; nonce: number }
  /** 请求 XML 面板定位到包含该文本的位置（nonce 用于重复触发） */
  xmlFocus?: { kind: DocKind; needle: string; nonce: number }

  /** 导入文档（进入历史，可撤销） */
  load: (kind: DocKind, source: XmlSource, fileName: string) => void
  /** 提交一次编辑 */
  commit: (kind: DocKind, doc: XMLDocument, label: string) => void
  /**
   * 用 XML 文本替换文档
   * @throws {Error} XML 不合法或根节点不对时抛出，文档保持不变
   */
  replaceText: (kind: DocKind, text: string) => void
  undo: () => void
  redo: () => void
  markSaved: () => void
  /** 清空并恢复到初始状态 */
  reset: () => void
  setUi: (patch: Partial<UiState>) => void
  select: (name: string | undefined, key?: number) => void
  toggleLayer: (layer: keyof Layers) => void
}

/** 可直接 setUi 的界面状态 */
type UiState = Pick<
  SceneEditorState,
  | 'time'
  | 'playing'
  | 'rate'
  | 'fps'
  | 'duration'
  | 'tool'
  | 'snapToLane'
  | 'autoKey'
  | 'xmlOpen'
  | 'xmlTab'
  | 'selectedKey'
  | 'drawSpeed'
  | 'viewCenter'
  | 'inspectorTab'
  | 'xmlFocus'
  | 'fitRequest'
  | 'canvasFocus'
>

const INITIAL = {
  xodr: undefined,
  xosc: undefined,
  xodrName: 'road.xodr',
  xoscName: 'scene.xosc',
  past: [] as Snapshot[],
  future: [] as Snapshot[],
  dirty: false,
  revision: 0,
  selected: undefined,
  selectedKey: undefined,
  time: 0,
  playing: false,
  rate: 1,
  fps: 10,
  duration: 20,
  tool: 'select' as CanvasTool,
  layers: { lanes: true, marks: true, entities: true, trajectories: true, labels: true },
  snapToLane: true,
  autoKey: true,
  xmlOpen: false,
  xmlTab: 'xosc' as DocKind,
  drawSpeed: 10,
  viewCenter: { x: 0, y: 0 },
  inspectorTab: 'entity' as InspectorTab,
  xmlFocus: undefined,
  fitRequest: 0,
  canvasFocus: undefined,
}

/**
 * 校验文档能被对应解析器接受
 * @param kind - 文档类型
 * @param source - XML 源
 * @throws {Error} 根节点不对等无法解析时抛出
 */
const assertParsable = (kind: DocKind, source: XmlSource) => {
  if (kind === 'xodr') parseOpenDrive(source.doc)
  else parseOpenScenario(source.doc)
}

/** 场景编辑器状态：文档 + 历史 + 界面 */
export const useSceneEditorStore = create<SceneEditorState>()((set, get) => {
  /** 记录当前快照后写入新文档 */
  const push = (patch: Partial<Pick<SceneEditorState, 'xodr' | 'xosc'>>, label: string) => {
    const { xodr, xosc, past, revision } = get()
    set({
      ...patch,
      past: [...past, { xodr, xosc, label }].slice(-HISTORY_LIMIT),
      future: [],
      dirty: true,
      revision: revision + 1,
    })
  }

  /** 撤销 / 重做后清理不存在的选中实体 */
  const fixSelection = () => {
    const { selected, xosc } = get()
    if (!selected || !xosc) return set({ selected: undefined, selectedKey: undefined })
    const exists = parseOpenScenario(xosc.doc).entities.some((e) => e.name === selected)
    if (!exists) set({ selected: undefined, selectedKey: undefined })
  }

  return {
    ...INITIAL,

    load: (kind, source, fileName) => {
      assertParsable(kind, source)
      push(kind === 'xodr' ? { xodr: source } : { xosc: source }, `导入 ${fileName}`)
      set(kind === 'xodr' ? { xodrName: fileName } : { xoscName: fileName, selected: undefined })
    },

    commit: (kind, doc, label) => {
      const current = get()[kind]
      push({ [kind]: { doc, declaration: current?.declaration ?? '' } }, label)
    },

    replaceText: (kind, text) => {
      const source = parseXml(text)
      assertParsable(kind, source)
      push({ [kind]: source }, `修改 ${kind} 文本`)
      if (kind === 'xosc') fixSelection()
    },

    undo: () => {
      const { past, future, xodr, xosc, revision } = get()
      const prev = past.at(-1)
      if (!prev) return
      set({
        xodr: prev.xodr,
        xosc: prev.xosc,
        past: past.slice(0, -1),
        future: [...future, { xodr, xosc, label: prev.label }],
        dirty: true,
        revision: revision + 1,
      })
      fixSelection()
    },

    redo: () => {
      const { past, future, xodr, xosc, revision } = get()
      const next = future.at(-1)
      if (!next) return
      set({
        xodr: next.xodr,
        xosc: next.xosc,
        future: future.slice(0, -1),
        past: [...past, { xodr, xosc, label: next.label }],
        dirty: true,
        revision: revision + 1,
      })
      fixSelection()
    },

    markSaved: () => set({ dirty: false }),
    reset: () => set({ ...INITIAL, revision: get().revision + 1 }),
    setUi: (patch) => set(patch),
    select: (name, key) => set({ selected: name, selectedKey: key }),
    toggleLayer: (layer) => set((s) => ({ layers: { ...s.layers, [layer]: !s.layers[layer] } })),
  }
})
