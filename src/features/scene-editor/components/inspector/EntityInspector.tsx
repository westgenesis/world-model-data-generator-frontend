import { Alert, App, Button, Empty, Popconfirm, Segmented, Select, Tag, Tooltip } from 'antd'
import { Code2, Crosshair, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { CATEGORY_OPTIONS, SCENE_ELEMENTS, SIZE_PRESETS } from '../../constants/elements'
import type { OscEntity } from '../../core/openscenario/types'
import {
  commitKeyframes,
  convertToInline,
  deleteEntity,
  renameSelected,
  updateEntityProps,
  updateInitPose,
  updateInitSpeed,
} from '../../hooks/scene-actions'
import type { SceneModel } from '../../hooks/use-scene-model'
import { useSceneEditorStore } from '../../stores/scene-editor-store'
import { Field, NumberField, TextField } from './fields'
import { KeyframeTable } from './KeyframeTable'

/** 位置写法的中文名 */
const POSITION_LABEL: Record<string, string> = {
  world: '世界坐标',
  lane: '车道坐标',
  road: '道路坐标',
  relativeObject: '相对实体',
  relativeWorld: '相对世界',
  relativeLane: '相对车道',
  relativeRoad: '相对道路',
}

/**
 * 实体图标：按类别匹配元件库图标
 * @param entity - 实体
 * @returns 图标组件
 */
const iconOf = (entity: OscEntity) =>
  (
    SCENE_ELEMENTS.find((e) => e.kind === entity.kind && e.category === entity.category) ??
    SCENE_ELEMENTS.find((e) => e.kind === entity.kind)
  )?.icon ?? SCENE_ELEMENTS[0].icon

type Filter = 'all' | 'dynamic' | 'static'

/**
 * 目标物面板：实体列表 + 选中实体的属性与关键帧
 * @param props.scene - 场景派生数据
 */
export const EntityInspector = ({ scene }: { scene: SceneModel | undefined }) => {
  const { message, modal } = App.useApp()
  const selected = useSceneEditorStore((s) => s.selected)
  const select = useSceneEditorStore((s) => s.select)
  const setUi = useSceneEditorStore((s) => s.setUi)
  const [filter, setFilter] = useState<Filter>('all')

  if (!scene) {
    return (
      <Empty
        className="mt-12"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="导入或新建场景后显示目标物"
      />
    )
  }

  const { scenario, motions, poses } = scene
  const isDynamic = (e: OscEntity) => (motions.get(e.name)?.keyframes.length ?? 0) >= 2
  const list = scenario.entities.filter((e) =>
    filter === 'all' ? true : filter === 'dynamic' ? isDynamic(e) : !isDynamic(e),
  )
  const entity = scenario.entities.find((e) => e.name === selected)

  /** 统一处理编辑异常 */
  const run = (fn: () => void) => {
    try {
      fn()
    } catch (e) {
      message.error(e instanceof Error ? e.message : String(e))
    }
  }

  const remove = (name: string) => {
    const dangling = deleteEntity(name)
    if (dangling > 0) {
      modal.warning({
        title: `${name} 已删除`,
        content: `场景中仍有 ${dangling} 处引用了该实体（例如原有的动作或触发条件），请在 XML 中检查，或撤销此次删除。`,
      })
    }
  }

  return (
    <div className="flex flex-col">
      <section className="border-b border-line p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-medium text-fg-3">场景对象（{scenario.entities.length}）</h3>
          <Segmented<Filter>
            size="small"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: '全部' },
              { value: 'dynamic', label: '动态' },
              { value: 'static', label: '静态' },
            ]}
          />
        </div>
        {list.length === 0 ? (
          <p className="py-3 text-center text-xs text-fg-3">从左侧元件库拖入目标物</p>
        ) : (
          <ul className="-mx-1 max-h-56 space-y-0.5 overflow-y-auto">
            {list.map((e) => {
              const Icon = iconOf(e)
              const pos = scenario.initPositions.get(e.name)
              return (
                <li key={e.name}>
                  <button
                    type="button"
                    onClick={() => {
                      select(e.name)
                      setUi({ canvasFocus: { name: e.name, nonce: Date.now() } })
                    }}
                    className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-left text-[13px] transition-colors hover:bg-sunken focus-visible:outline-2 focus-visible:outline-primary ${
                      selected === e.name ? 'bg-primary-soft text-primary' : 'text-fg'
                    }`}
                  >
                    <Icon size={15} strokeWidth={1.75} className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate font-medium">{e.name}</span>
                    {isDynamic(e) && (
                      <Tag variant="filled" color="blue" className="me-0!">
                        {motions.get(e.name)?.keyframes.length} 帧
                      </Tag>
                    )}
                    {!poses.has(e.name) && (
                      <Tooltip
                        title={pos?.kind === 'unsupported' ? `暂不支持 ${pos.tag}` : '位置无法解析'}
                      >
                        <Tag variant="filled" color="orange" className="me-0!">
                          未定位
                        </Tag>
                      </Tooltip>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {entity ? (
        <EntityProps key={entity.name} entity={entity} scene={scene} run={run} onRemove={remove} />
      ) : (
        <p className="p-4 text-center text-xs text-fg-3">在画布或列表中选择目标物以编辑属性</p>
      )}

      {entity && (
        <div className="flex gap-2 border-t border-line p-3">
          <Button
            size="small"
            icon={<Code2 size={14} strokeWidth={1.75} />}
            onClick={() =>
              setUi({
                xmlOpen: true,
                xmlTab: 'xosc',
                xmlFocus: { kind: 'xosc', needle: `name="${entity.name}"`, nonce: Date.now() },
              })
            }
          >
            在 XML 中定位
          </Button>
        </div>
      )}
    </div>
  )
}

interface EntityPropsProps {
  entity: OscEntity
  scene: SceneModel
  run: (fn: () => void) => void
  onRemove: (name: string) => void
}

/**
 * 选中实体的属性表单
 * @param props - 实体、场景与操作
 */
const EntityProps = ({ entity, scene, run, onRemove }: EntityPropsProps) => {
  const drawSpeed = useSceneEditorStore((s) => s.drawSpeed)
  const setUi = useSceneEditorStore((s) => s.setUi)
  const pose = scene.poses.get(entity.name)
  const position = scene.scenario.initPositions.get(entity.name)
  const motion = scene.motions.get(entity.name)
  const speed = scene.scenario.initSpeeds.get(entity.name)
  const isCatalog = !!entity.catalog
  const hasTrajectory = (motion?.keyframes.length ?? 0) >= 2
  const deg = (r: number) => (r * 180) / Math.PI

  return (
    <div className="flex flex-col gap-4 p-3">
      <section className="grid grid-cols-2 gap-x-2 gap-y-2.5">
        <h3 className="col-span-full text-xs font-medium text-fg-3">选中对象属性</h3>
        <Field label="名称" wide>
          <TextField
            value={entity.name}
            onCommit={(v) => run(() => renameSelected(entity.name, v))}
          />
        </Field>
        {isCatalog && (
          <Alert
            className="col-span-full px-2! py-1.5! text-xs!"
            type="info"
            showIcon={false}
            title={
              <div className="flex items-center justify-between gap-2">
                <span>
                  目录引用 {entity.catalog?.catalogName} / {entity.catalog?.entryName}，尺寸为估算值
                </span>
                <Button
                  size="small"
                  type="link"
                  className="px-0!"
                  onClick={() => run(() => convertToInline(entity))}
                >
                  转为内联
                </Button>
              </div>
            }
          />
        )}
        <Field label="类别" wide>
          <Select
            size="small"
            value={entity.category}
            disabled={isCatalog}
            options={CATEGORY_OPTIONS[entity.kind]}
            onChange={(category) => run(() => updateEntityProps(entity.name, { category }))}
          />
        </Field>
        <Field label="尺寸预设" wide>
          <Select
            size="small"
            placeholder="选择预设"
            disabled={isCatalog}
            value={null}
            options={SIZE_PRESETS.map((p, i) => ({ value: i, label: p.label }))}
            onChange={(i: number) => {
              const { length, width, height } = SIZE_PRESETS[i]
              run(() => updateEntityProps(entity.name, { length, width, height }))
            }}
          />
        </Field>
        <div className="col-span-full grid grid-cols-3 gap-2">
          <Field label="长 m">
            <NumberField
              value={entity.length}
              min={0.1}
              disabled={isCatalog}
              onCommit={(length) => run(() => updateEntityProps(entity.name, { length }))}
            />
          </Field>
          <Field label="宽 m">
            <NumberField
              value={entity.width}
              min={0.1}
              disabled={isCatalog}
              onCommit={(width) => run(() => updateEntityProps(entity.name, { width }))}
            />
          </Field>
          <Field label="高 m">
            <NumberField
              value={entity.height}
              min={0.1}
              disabled={isCatalog}
              onCommit={(height) => run(() => updateEntityProps(entity.name, { height }))}
            />
          </Field>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2">
        <h3 className="col-span-full flex items-center gap-2 text-xs font-medium text-fg-3">
          初始状态
          {position && position.kind !== 'unsupported' && (
            <Tag variant="filled" className="me-0!">
              {POSITION_LABEL[position.kind]}
            </Tag>
          )}
        </h3>
        <Field label="X m">
          <NumberField
            value={pose?.x}
            onCommit={(x) =>
              pose &&
              run(() => updateInitPose(entity.name, { kind: 'world', x, y: pose.y, h: pose.hdg }))
            }
          />
        </Field>
        <Field label="Y m">
          <NumberField
            value={pose?.y}
            onCommit={(y) =>
              pose &&
              run(() => updateInitPose(entity.name, { kind: 'world', x: pose.x, y, h: pose.hdg }))
            }
          />
        </Field>
        <Field label="朝向 °">
          <NumberField
            value={pose ? deg(pose.hdg) : undefined}
            step={5}
            precision={1}
            onCommit={(d) =>
              pose &&
              run(() =>
                updateInitPose(entity.name, {
                  kind: 'world',
                  x: pose.x,
                  y: pose.y,
                  h: (d * Math.PI) / 180,
                }),
              )
            }
          />
        </Field>
        {position?.kind === 'lane' && (
          <p className="col-span-full text-xs text-fg-3">
            道路 {position.roadId} · 车道 {position.laneId} · s={position.s.toFixed(1)}
            ；修改坐标后改为世界坐标
          </p>
        )}
        {entity.kind !== 'misc' && (
          <Field label="初始速度 m/s" wide>
            <NumberField
              value={speed}
              min={0}
              max={100}
              step={0.5}
              onCommit={(v) => run(() => updateInitSpeed(entity.name, v))}
            />
          </Field>
        )}
      </section>

      {entity.kind !== 'misc' && (
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium text-fg-3">运动轨迹 · 关键帧</h3>
            {hasTrajectory && motion?.managed && (
              <Popconfirm
                title="清除轨迹？"
                description="只保留首帧作为初始位置"
                onConfirm={() =>
                  run(() =>
                    commitKeyframes(
                      entity.name,
                      motion.keyframes.slice(0, 1),
                      `清除 ${entity.name} 轨迹`,
                    ),
                  )
                }
              >
                <Button type="link" size="small" className="px-0!">
                  清除轨迹
                </Button>
              </Popconfirm>
            )}
          </div>
          {motion?.notice && (
            <Alert
              type="warning"
              showIcon={false}
              className="px-2! py-1.5! text-xs!"
              title={motion.notice}
            />
          )}
          {hasTrajectory && motion ? (
            <KeyframeTable name={entity.name} motion={motion} />
          ) : (
            <div className="flex flex-col gap-2 rounded-lg border border-dashed border-line p-3 text-xs text-fg-3">
              <p>还没有轨迹。可以：</p>
              <ul className="list-inside list-disc space-y-0.5">
                <li>选择「绘制轨迹」工具，在画布上逐点单击</li>
                <li>把播放头移到其他时刻，再拖动目标物（自动记帧）</li>
              </ul>
              <Button
                size="small"
                icon={<Crosshair size={14} strokeWidth={1.75} />}
                onClick={() => setUi({ tool: 'draw' })}
              >
                开始绘制轨迹
              </Button>
            </div>
          )}
          <Field label="绘制速度 m/s（新增点的时刻 = 距离 / 速度）">
            <NumberField
              value={drawSpeed}
              min={0.1}
              max={80}
              step={0.5}
              onCommit={(v) => setUi({ drawSpeed: v })}
            />
          </Field>
        </section>
      )}

      <Popconfirm
        title={`删除 ${entity.name}？`}
        description="可通过撤销恢复"
        onConfirm={() => onRemove(entity.name)}
      >
        <Button danger size="small" icon={<Trash2 size={14} strokeWidth={1.75} />}>
          删除目标物
        </Button>
      </Popconfirm>
    </div>
  )
}
