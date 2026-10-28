import { createFileRoute, Link } from '@tanstack/react-router'
import { Button, Empty } from 'antd'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/** 场景编辑器：全屏工作台，不使用主布局（参考 docs/原型/M2场景编辑器_原型.html） */
const SceneEditorPage = () => {
  const { t } = useTranslation()
  const { sceneId } = Route.useParams()

  return (
    <div className="flex h-screen flex-col bg-card">
      <div className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-1.5">
        <Link to="/data-gen/scene-resources">
          <Button type="text" size="small" icon={<ArrowLeft size={16} strokeWidth={1.75} />}>
            {t('sceneEditor.back')}
          </Button>
        </Link>
        <span className="text-[15px] font-semibold">{t('sceneEditor.title')}</span>
        <span className="text-xs text-fg-3">{sceneId}</span>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="w-52 shrink-0 border-r border-line" />
        <div className="flex flex-1 items-center justify-center bg-page">
          <Empty description={t('common.placeholderDesc')} />
        </div>
        <div className="w-76 shrink-0 border-l border-line" />
      </div>
    </div>
  )
}

export const Route = createFileRoute('/scene-editor/$sceneId')({
  component: SceneEditorPage,
})
