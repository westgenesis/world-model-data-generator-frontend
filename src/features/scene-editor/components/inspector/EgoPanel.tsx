import { Alert, App, Button, Dropdown, Empty, Select, Tag, Tooltip } from 'antd'
import type { LucideIcon } from 'lucide-react'
import { Camera, Crosshair, Orbit, Plus, Radar, Trash2 } from 'lucide-react'
import { SENSOR_PRESETS } from '../../core/sensors/presets'
import type { Sensor, SensorType } from '../../core/sensors/types'
import { SENSOR_TYPE_LABEL } from '../../core/sensors/types'
import { addSensor, addSensorKit, removeSensor, setEgoVehicle } from '../../hooks/ego-actions'
import { convertToInline } from '../../hooks/scene-actions'
import type { SceneModel } from '../../hooks/use-scene-model'
import { useSceneEditorStore } from '../../stores/scene-editor-store'
import { Hint } from './fields'
import { SensorForm } from './SensorForm'

/** 传感器类型图标 */
const SENSOR_ICONS: Record<SensorType, LucideIcon> = {
  camera: Camera,
  lidar: Orbit,
  radar: Radar,
}

/**
 * 位姿摘要
 * @param sensor - 传感器
 * @returns 形如 "1.9, 0, 1.4 · 0°"
 */
const poseSummary = ({ pose }: Sensor) =>
  `${[pose.x, pose.y, pose.z].map((v) => +v.toFixed(2)).join(', ')} · ${+pose.yaw.toFixed(1)}°`

/**
 * 自车面板：指定自车、管理自车传感器（独立的传感器配置 JSON）
 * @param props.scene - 场景派生数据
 */
export const EgoPanel = ({ scene }: { scene: SceneModel | undefined }) => {
  const { message } = App.useApp()
  const sensors = useSceneEditorStore((s) => s.sensors)
  const selectedSensor = useSceneEditorStore((s) => s.selectedSensor)
  const setUi = useSceneEditorStore((s) => s.setUi)

  /** 统一处理编辑异常 */
  const run = (fn: () => void) => {
    try {
      fn()
    } catch (e) {
      message.error(e instanceof Error ? e.message : String(e))
    }
  }

  if (!scene) {
    return <Empty className="mt-12" description="导入或新建场景后指定自车" />
  }

  const { entities, sensorFile } = scene.scenario
  const vehicles = entities.filter((e) => e.kind === 'vehicle')
  const egos = entities.filter((e) => e.ego)
  const ego = egos.length === 1 ? egos[0] : undefined
  const list = sensors?.config.sensors ?? []
  const current = list.find((s) => s.id === selectedSensor)

  return (
    <div className="flex flex-col gap-4 p-3">
      <section className="flex flex-col gap-2">
        <h3 className="flex items-center gap-1 text-xs font-medium text-fg-3">
          自车
          <Hint
            title={
              <>
                自车写入 Vehicle/Properties：type=ego_vehicle（CARLA 约定）；
                <br />
                传感器配置单独保存为 JSON，由自车的 File 引用
              </>
            }
          />
        </h3>
        <Select
          size="small"
          placeholder={vehicles.length ? '选择一辆车作为自车' : '场景中还没有车辆'}
          value={ego?.name}
          allowClear
          onChange={(name?: string) => run(() => setEgoVehicle(name))}
          options={vehicles.map((v) => ({
            value: v.name,
            label: v.catalog ? `${v.name}（目录引用）` : v.name,
            disabled: !!v.catalog,
          }))}
        />
        {egos.length > 1 && (
          <Alert
            type="error"
            showIcon
            className="px-2! py-1.5! text-xs!"
            title={`多辆车被标记为自车：${egos.map((e) => e.name).join('、')}，请重新选择`}
          />
        )}
        {vehicles.some((v) => v.catalog) && (
          <p className="text-[11px] leading-4 text-fg-3">
            转为内联后可设为自车：
            {vehicles
              .filter((v) => v.catalog)
              .map((v) => (
                <Button
                  key={v.name}
                  type="link"
                  size="small"
                  className="h-auto! px-1! text-[11px]!"
                  onClick={() => run(() => convertToInline(v))}
                >
                  {v.name}
                </Button>
              ))}
          </p>
        )}
        {ego && (
          <div className="flex items-center gap-2 rounded-lg bg-sunken px-2.5 py-2 text-xs text-fg-2">
            <span className="min-w-0 flex-1 truncate">
              <span className="font-medium text-fg">{ego.name}</span> · {ego.category}
              {ego.role ? ` / ${ego.role}` : ''} · {ego.length}×{ego.width}×{ego.height} m
            </span>
            <Tooltip title="在画布中定位">
              <Button
                type="text"
                size="small"
                aria-label="在画布中定位自车"
                icon={<Crosshair size={14} strokeWidth={1.75} />}
                onClick={() => {
                  useSceneEditorStore.getState().select(ego.name)
                  setUi({ canvasFocus: { name: ego.name, nonce: Date.now() } })
                }}
              />
            </Tooltip>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h3 className="flex items-center gap-1 text-xs font-medium text-fg-3">
            传感器（{list.length}）{sensors && <Hint title={`配置文件：${sensors.fileName}`} />}
          </h3>
          <div className="ms-auto flex gap-1">
            {list.length === 0 && (
              <Tooltip title={ego ? '前视主相机 + 主激光雷达 + 前向毫米波雷达' : '请先指定自车'}>
                <Button size="small" disabled={!ego} onClick={() => run(addSensorKit)}>
                  默认套件
                </Button>
              </Tooltip>
            )}
            <Dropdown
              disabled={!ego}
              menu={{
                items: SENSOR_PRESETS.map((p) => ({ key: p.id, label: p.label })),
                onClick: ({ key }) => run(() => addSensor(key)),
              }}
            >
              <Button size="small" type="primary" icon={<Plus size={13} strokeWidth={2} />}>
                添加
              </Button>
            </Dropdown>
          </div>
        </div>
        {list.length === 0 && !(sensorFile && !sensors) && (
          <p className="py-2 text-center text-xs text-fg-3">
            {ego ? '暂无传感器' : '请先指定自车'}
          </p>
        )}
        {sensorFile && !sensors && (
          <Alert
            type="warning"
            showIcon
            className="px-2! py-1.5! text-xs!"
            title={`缺少传感器配置「${sensorFile}」，请一并导入`}
          />
        )}
        {list.length > 0 && (
          <ul className="-mx-1 space-y-0.5">
            {list.map((s) => {
              const Icon = SENSOR_ICONS[s.type]
              const active = s.id === selectedSensor
              return (
                <li key={s.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    aria-pressed={active}
                    onClick={() => setUi({ selectedSensor: active ? undefined : s.id })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setUi({ selectedSensor: active ? undefined : s.id })
                      }
                    }}
                    className={`group flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-sunken focus-visible:outline-2 focus-visible:outline-primary ${
                      active ? 'bg-primary-soft text-primary' : ''
                    }`}
                  >
                    <Icon size={15} strokeWidth={1.75} className="shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{s.name}</span>
                      <span className="block truncate text-[11px] text-fg-3">
                        {SENSOR_TYPE_LABEL[s.type]} · {s.id} · {poseSummary(s)}
                      </span>
                    </span>
                    {s.type === 'camera' && s.camera.calibrated && (
                      <Tag color="green" variant="filled" className="me-0!">
                        已标定
                      </Tag>
                    )}
                    <Tooltip title="删除（可撤销）">
                      <Button
                        type="text"
                        size="small"
                        danger
                        aria-label={`删除传感器 ${s.name}`}
                        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                        icon={<Trash2 size={13} strokeWidth={1.75} />}
                        onClick={(e) => {
                          e.stopPropagation()
                          run(() => removeSensor(s.id))
                        }}
                      />
                    </Tooltip>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {current && <SensorForm key={current.id} sensor={current} run={run} />}
    </div>
  )
}
