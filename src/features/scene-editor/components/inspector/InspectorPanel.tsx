import { Badge, Tabs } from 'antd'
import { useMemo } from 'react'
import { validateScene } from '../../core/validate'
import { useSceneModel } from '../../hooks/use-scene-model'
import type { InspectorTab } from '../../stores/scene-editor-store'
import { useSceneEditorStore } from '../../stores/scene-editor-store'
import { EntityInspector } from './EntityInspector'
import { ScenePanel } from './ScenePanel'
import { ValidationPanel } from './ValidationPanel'

/** 右侧面板：目标物 / 场景 / 校验 */
export const InspectorPanel = () => {
  const { road, scene } = useSceneModel()
  const xosc = useSceneEditorStore((s) => s.xosc)
  const tab = useSceneEditorStore((s) => s.inspectorTab)
  const setUi = useSceneEditorStore((s) => s.setUi)

  const issues = useMemo(
    () =>
      validateScene({
        scenario: scene?.scenario,
        doc: xosc?.doc,
        mesh: road?.mesh,
        poses: scene?.poses,
        motions: scene?.motions,
      }),
    [scene, xosc, road],
  )
  const problemCount = issues.filter((i) => i.level !== 'info').length

  return (
    <Tabs
      size="small"
      activeKey={tab}
      onChange={(k) => setUi({ inspectorTab: k as InspectorTab })}
      // antd v6 的标签页内容位于 .ant-tabs（纵向 flex）> .ant-tabs-body-holder > .ant-tabs-body 中。
      // 让 body-holder 填满剩余高度并自行滚动；否则内容撑高面板，外层 overflow-hidden 的容器
      // 会在聚焦输入框时被浏览器整体滚走。antd 样式不在 Tailwind 的 layer 内，需用 ! 提升优先级
      className="h-full [&_.ant-tabs-body-holder]:min-h-0! [&_.ant-tabs-body-holder]:overflow-x-hidden! [&_.ant-tabs-body-holder]:overflow-y-auto! [&_.ant-tabs-nav]:mb-0! [&_.ant-tabs-nav]:px-3"
      items={[
        { key: 'entity', label: '目标物', children: <EntityInspector scene={scene} /> },
        { key: 'scene', label: '场景', children: <ScenePanel road={road} scene={scene} /> },
        {
          key: 'validate',
          label: (
            <span className="flex items-center gap-1.5">
              校验
              {problemCount > 0 && <Badge count={problemCount} size="small" color="orange" />}
            </span>
          ),
          children: <ValidationPanel issues={issues} />,
        },
      ]}
    />
  )
}
