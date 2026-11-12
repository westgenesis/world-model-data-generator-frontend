import { useCallback, useEffect } from 'react'
import { createEmptyScenario } from '../core/openscenario/edit'
import { parseOpenScenario } from '../core/openscenario/parse'
import {
  isSensorConfigText,
  parseSensorConfig,
  serializeSensorConfig,
} from '../core/sensors/schema'
import { parseXml, serializeXml } from '../core/xml'
import type { DocKind, PaneKind } from '../stores/scene-editor-store'
import { useSceneEditorStore } from '../stores/scene-editor-store'

/** 本地草稿内容 */
interface Draft {
  xodr?: string
  xosc?: string
  /** 传感器配置 JSON */
  sensors?: string
  xodrName: string
  xoscName: string
  sensorsName?: string
  savedAt: string
}

/**
 * 本地草稿的 localStorage 键
 * @param sceneId - 场景 id
 * @returns 键
 */
const draftKey = (sceneId: string) => `wmdg-scene-draft:${sceneId}`

/**
 * 触发浏览器下载文本文件
 * @param fileName - 文件名
 * @param text - 文件内容
 */
const downloadText = (fileName: string, text: string) => {
  const type = fileName.toLowerCase().endsWith('.json') ? 'application/json' : 'application/xml'
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * 获取 URL 文本内容
 * @param url - 地址
 * @returns 文本
 * @throws {Error} 请求失败时抛出
 */
const fetchText = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`加载失败（HTTP ${res.status}）：${url}`)
  return res.text()
}

/** 通过 URL 取回的文件 */
export interface FetchedFile {
  name: string
  text: string
}

/**
 * 按 URL 获取 xodr / xosc 文本（用于路由 loader）。
 * 只给 xosc 时，按其 LogicFile 相对路径一并获取路网；自车引用了传感器配置时一并获取
 * （获取失败不阻断加载，校验面板会提示缺少传感器配置）。
 * @param urls.xodr - 路网地址
 * @param urls.xosc - 场景地址
 * @returns 文件列表（路网在前）
 * @throws {Error} 请求失败或 xosc 不合法时抛出
 */
export const fetchSceneFiles = async ({
  xodr,
  xosc,
}: {
  xodr?: string
  xosc?: string
}): Promise<FetchedFile[]> => {
  const base = window.location.href
  const files: FetchedFile[] = []
  let roadUrl = xodr && new URL(xodr, base).href
  let scene: FetchedFile | undefined
  let sensors: FetchedFile | undefined
  if (xosc) {
    const sceneUrl = new URL(xosc, base).href
    scene = { name: sceneUrl.split('/').pop() ?? 'scene.xosc', text: await fetchText(sceneUrl) }
    const { logicFile, sensorFile } = parseOpenScenario(parseXml(scene.text).doc)
    if (!roadUrl && logicFile) roadUrl = new URL(logicFile, sceneUrl).href
    if (sensorFile) {
      const sensorUrl = new URL(sensorFile, sceneUrl).href
      try {
        sensors = {
          name: sensorUrl.split('/').pop() ?? 'sensors.json',
          text: await fetchText(sensorUrl),
        }
      } catch {
        // 缺少传感器配置时仍加载场景
      }
    }
  }
  if (roadUrl)
    files.push({ name: roadUrl.split('/').pop() ?? 'road.xodr', text: await fetchText(roadUrl) })
  if (scene) files.push(scene)
  if (sensors) files.push(sensors)
  return files
}

/**
 * 读取本地草稿
 * @param sceneId - 场景 id
 * @returns 草稿；不存在或存储不可用时返回 undefined
 */
export const readDraft = (sceneId: string): Draft | undefined => {
  try {
    const raw = localStorage.getItem(draftKey(sceneId))
    return raw ? (JSON.parse(raw) as Draft) : undefined
  } catch {
    return undefined
  }
}

/**
 * 场景文件的导入、导出、新建与本地草稿
 * @param sceneId - 场景 id（草稿按 id 区分）
 * @returns 操作函数
 */
export const useSceneIo = (sceneId: string) => {
  const load = useSceneEditorStore((s) => s.load)

  /** 按扩展名导入一个文件：.xodr / .xosc，或 format 为 wmdg-sensor-config 的 .json */
  const importText = useCallback(
    (fileName: string, text: string): PaneKind => {
      const lower = fileName.toLowerCase()
      if (lower.endsWith('.json')) {
        if (!isSensorConfigText(text)) {
          throw new Error(`${fileName} 不是传感器配置文件（format 应为 wmdg-sensor-config）`)
        }
        useSceneEditorStore
          .getState()
          .commitSensors({ config: parseSensorConfig(text), fileName }, `导入 ${fileName}`)
        return 'sensors'
      }
      const kind: DocKind | undefined = lower.endsWith('.xodr')
        ? 'xodr'
        : lower.endsWith('.xosc')
          ? 'xosc'
          : undefined
      if (!kind) {
        throw new Error(`不支持的文件类型：${fileName}（仅支持 .xodr / .xosc / 传感器配置 .json）`)
      }
      load(kind, parseXml(text), fileName)
      return kind
    },
    [load],
  )

  /** 导入多个本地文件（路网 → 场景 → 传感器配置，便于场景解析时路网已就绪） */
  const importFiles = useCallback(
    async (files: File[]) => {
      const order = (name: string) => {
        const lower = name.toLowerCase()
        return lower.endsWith('.xodr') ? 0 : lower.endsWith('.xosc') ? 1 : 2
      }
      const sorted = [...files].sort((a, b) => order(a.name) - order(b.name))
      for (const file of sorted) importText(file.name, await file.text())
    },
    [importText],
  )

  /** 导入已取回的文件文本（路网在前） */
  const importFetched = useCallback(
    (files: FetchedFile[]) => {
      for (const f of files) importText(f.name, f.text)
    },
    [importText],
  )

  /** 导出单个文档：xodr / xosc / 传感器配置 JSON */
  const exportDoc = useCallback((kind: PaneKind) => {
    const s = useSceneEditorStore.getState()
    if (kind === 'sensors') {
      if (s.sensors) downloadText(s.sensors.fileName, serializeSensorConfig(s.sensors.config))
      return
    }
    const source = s[kind]
    if (source) downloadText(kind === 'xodr' ? s.xodrName : s.xoscName, serializeXml(source))
  }, [])

  /** 新建空场景（引用当前路网） */
  const newScenario = useCallback(() => {
    const s = useSceneEditorStore.getState()
    load(
      'xosc',
      createEmptyScenario({ logicFile: s.xodr ? s.xodrName : 'road.xodr' }),
      'scene.xosc',
    )
    s.select(undefined)
  }, [load])

  /**
   * 保存草稿到本地
   * @returns 是否成功（存储已满或被禁用时失败）
   */
  const saveDraft = useCallback(() => {
    const s = useSceneEditorStore.getState()
    const draft: Draft = {
      xodr: s.xodr && serializeXml(s.xodr),
      xosc: s.xosc && serializeXml(s.xosc),
      sensors: s.sensors && serializeSensorConfig(s.sensors.config),
      xodrName: s.xodrName,
      xoscName: s.xoscName,
      sensorsName: s.sensors?.fileName,
      savedAt: new Date().toISOString(),
    }
    try {
      localStorage.setItem(draftKey(sceneId), JSON.stringify(draft))
      s.markSaved()
      return true
    } catch {
      return false
    }
  }, [sceneId])

  /** 恢复本地草稿 */
  const restoreDraft = useCallback(() => {
    const draft = readDraft(sceneId)
    if (!draft) return false
    if (draft.xodr) importText(draft.xodrName, draft.xodr)
    if (draft.xosc) importText(draft.xoscName, draft.xosc)
    if (draft.sensors) importText(draft.sensorsName ?? 'scene.sensors.json', draft.sensors)
    useSceneEditorStore.getState().markSaved()
    return true
  }, [sceneId, importText])

  // 有未保存修改时离开页面前提醒
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (useSceneEditorStore.getState().dirty) e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  return { importFiles, importFetched, exportDoc, newScenario, saveDraft, restoreDraft }
}
