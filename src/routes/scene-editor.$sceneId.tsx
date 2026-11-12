import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { fetchSceneFiles } from '@/features/scene-editor/hooks/use-scene-io'
import { SceneEditorPage } from '@/features/scene-editor/SceneEditorPage'

/** 查询参数：开发调试时可直接指定 xodr / xosc 地址 */
const searchSchema = z.object({
  xodr: z.string().optional().catch(undefined),
  xosc: z.string().optional().catch(undefined),
})

/** 场景编辑器：全屏工作台，不使用主布局（参考 docs/原型/M2场景编辑器_原型.html） */
export const Route = createFileRoute('/scene-editor/$sceneId')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ xodr: search.xodr, xosc: search.xosc }),
  // 文件内容只在进入页面时获取一次
  staleTime: Infinity,
  // 开发调试：按查询参数预取文件；失败时把错误交给页面提示，不阻断编辑器
  loader: async ({ deps }) => {
    if (!deps.xodr && !deps.xosc) return { files: [] }
    try {
      return { files: await fetchSceneFiles(deps) }
    } catch (e) {
      return { files: [], error: e instanceof Error ? e.message : String(e) }
    }
  },
  component: SceneEditorPage,
})
