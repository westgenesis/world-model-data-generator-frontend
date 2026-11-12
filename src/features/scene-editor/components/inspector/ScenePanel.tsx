import { Alert, Descriptions, Empty, Select, Tag } from 'antd'
import { getStopTime } from '../../core/openscenario/edit'
import { updateLogicFile, updateStopTime } from '../../hooks/scene-actions'
import type { RoadModel, SceneModel } from '../../hooks/use-scene-model'
import { useSceneEditorStore } from '../../stores/scene-editor-store'
import { Field, Hint, NumberField, TextField } from './fields'

interface ScenePanelProps {
  road?: RoadModel
  scene?: SceneModel
}

/**
 * 场景面板：文件信息、时长与帧率、路网统计、未支持内容
 * @param props.road - 路网派生数据
 * @param props.scene - 场景派生数据
 */
export const ScenePanel = ({ road, scene }: ScenePanelProps) => {
  const xosc = useSceneEditorStore((s) => s.xosc)
  const xodrName = useSceneEditorStore((s) => s.xodrName)
  const xoscName = useSceneEditorStore((s) => s.xoscName)
  const fps = useSceneEditorStore((s) => s.fps)
  const duration = useSceneEditorStore((s) => s.duration)
  const setUi = useSceneEditorStore((s) => s.setUi)

  if (!road && !scene) {
    return (
      <Empty
        className="mt-12"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="导入文件后显示场景信息"
      />
    )
  }

  const stopTime = xosc ? getStopTime(xosc.doc) : undefined
  const geometryCounts = road?.network.roads
    .flatMap((r) => r.geometries)
    .reduce<Record<string, number>>((acc, g) => ({ ...acc, [g.kind]: (acc[g.kind] ?? 0) + 1 }), {})
  const warnings = [...(road?.network.warnings ?? []), ...(scene?.scenario.warnings ?? [])]

  return (
    <div className="flex flex-col gap-4 p-3 text-[13px]">
      {scene && (
        <section className="grid grid-cols-2 gap-x-2 gap-y-2.5">
          <h3 className="col-span-full text-xs font-medium text-fg-3">场景 · {xoscName}</h3>
          {scene.scenario.description && (
            <p className="col-span-full text-fg-2">{scene.scenario.description}</p>
          )}
          <Field label="路网文件" hint="RoadNetwork/LogicFile：相对 xosc 的 .xodr 路径" wide>
            <TextField
              value={scene.scenario.logicFile ?? ''}
              placeholder="road.xodr"
              onCommit={updateLogicFile}
            />
          </Field>
          <Field label="仿真时长 s">
            <NumberField
              value={stopTime ?? duration}
              min={1}
              max={3600}
              step={1}
              precision={1}
              onCommit={updateStopTime}
            />
          </Field>
          <Field label="帧率" hint="拖动关键帧和逐帧播放时按此帧率吸附">
            <Select
              size="small"
              value={fps}
              onChange={(v) => setUi({ fps: v })}
              options={[10, 20, 25, 30].map((v) => ({ value: v, label: `${v} fps` }))}
            />
          </Field>
          <p className="col-span-full flex items-center gap-1 text-xs text-fg-3">
            OpenSCENARIO {scene.scenario.version} · 实体 {scene.scenario.entities.length} · 轨迹{' '}
            {scene.scenario.trajectories.length}
            {stopTime === undefined && (
              <Hint title="停止条件由原文件定义，修改仿真时长后由编辑器管理" />
            )}
          </p>
        </section>
      )}

      {road && (
        <section>
          <h3 className="mb-2 flex items-center gap-1 text-xs font-medium text-fg-3">
            路网 · {xodrName}
            <Hint title="路网暂不支持图形化编辑，可在 XML 面板中直接修改" />
          </h3>
          <Descriptions
            size="small"
            column={2}
            items={[
              { label: '版本', children: road.network.version },
              { label: '道路', children: road.network.roads.length },
              { label: '路口', children: road.network.junctions.length },
              { label: '车道片', children: road.mesh.lanes.length },
              { label: '解析', children: `${road.timings.parse.toFixed(0)} ms` },
              { label: '采样', children: `${road.timings.mesh.toFixed(0)} ms` },
            ]}
          />
          <div className="mt-1 flex flex-wrap gap-1">
            {Object.entries(geometryCounts ?? {}).map(([kind, n]) => (
              <Tag key={kind} variant="filled">
                {kind} × {n}
              </Tag>
            ))}
          </div>
        </section>
      )}

      {warnings.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-medium text-fg-3">未支持的内容（{warnings.length}）</h3>
          <div className="space-y-1.5">
            {warnings.map((w, i) => (
              <Alert
                key={i}
                type="warning"
                showIcon={false}
                className="px-2! py-1! text-xs!"
                title={
                  'roadId' in w && w.roadId
                    ? `道路 ${w.roadId}：${w.message}`
                    : 'entity' in w && w.entity
                      ? `${w.entity}：${w.message}`
                      : w.message
                }
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
