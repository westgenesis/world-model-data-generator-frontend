import type { LucideIcon } from 'lucide-react'
import {
  Bike,
  Bus,
  Car,
  CarFront,
  Fence,
  Motorbike,
  PersonStanding,
  TrafficCone,
  Truck,
} from 'lucide-react'
import type { EntityKind } from '../core/openscenario/types'

/** 元件库中的一种目标物 */
export interface SceneElement {
  id: string
  label: string
  icon: LucideIcon
  group: '车辆' | '弱势参与者' | '障碍物'
  kind: EntityKind
  /** 写入 vehicleCategory / pedestrianCategory / miscObjectCategory 的值 */
  category: string
  /** 新实体名前缀，如 Car → Car1 */
  prefix: string
  length: number
  width: number
  height: number
  /** 是否默认作为动态目标（可编辑轨迹） */
  dynamic: boolean
  /** 绘制轨迹时的默认速度（m/s） */
  speed: number
}

/** 元件库 */
export const SCENE_ELEMENTS: SceneElement[] = [
  {
    id: 'car',
    label: '轿车',
    icon: Car,
    group: '车辆',
    kind: 'vehicle',
    category: 'car',
    prefix: 'Car',
    length: 4.6,
    width: 1.8,
    height: 1.5,
    dynamic: true,
    speed: 10,
  },
  {
    id: 'suv',
    label: 'SUV',
    icon: CarFront,
    group: '车辆',
    kind: 'vehicle',
    category: 'car',
    prefix: 'Suv',
    length: 4.8,
    width: 1.9,
    height: 1.7,
    dynamic: true,
    speed: 10,
  },
  {
    id: 'truck',
    label: '货车',
    icon: Truck,
    group: '车辆',
    kind: 'vehicle',
    category: 'truck',
    prefix: 'Truck',
    length: 8.5,
    width: 2.5,
    height: 3.4,
    dynamic: true,
    speed: 8,
  },
  {
    id: 'bus',
    label: '公交车',
    icon: Bus,
    group: '车辆',
    kind: 'vehicle',
    category: 'bus',
    prefix: 'Bus',
    length: 12,
    width: 2.5,
    height: 3.2,
    dynamic: true,
    speed: 8,
  },
  {
    id: 'motorbike',
    label: '摩托车',
    icon: Motorbike,
    group: '车辆',
    kind: 'vehicle',
    category: 'motorbike',
    prefix: 'Moto',
    length: 2,
    width: 0.8,
    height: 1.5,
    dynamic: true,
    speed: 8,
  },
  {
    id: 'bicycle',
    label: '自行车',
    icon: Bike,
    group: '弱势参与者',
    kind: 'vehicle',
    category: 'bicycle',
    prefix: 'Bike',
    length: 1.8,
    width: 0.6,
    height: 1.7,
    dynamic: true,
    speed: 4,
  },
  {
    id: 'pedestrian',
    label: '行人',
    icon: PersonStanding,
    group: '弱势参与者',
    kind: 'pedestrian',
    category: 'pedestrian',
    prefix: 'Ped',
    length: 0.5,
    width: 0.5,
    height: 1.7,
    dynamic: true,
    speed: 1.4,
  },
  {
    id: 'cone',
    label: '锥桶',
    icon: TrafficCone,
    group: '障碍物',
    kind: 'misc',
    category: 'obstacle',
    prefix: 'Cone',
    length: 0.4,
    width: 0.4,
    height: 0.7,
    dynamic: false,
    speed: 0,
  },
  {
    id: 'barrier',
    label: '护栏',
    icon: Fence,
    group: '障碍物',
    kind: 'misc',
    category: 'barrier',
    prefix: 'Barrier',
    length: 3,
    width: 0.4,
    height: 1,
    dynamic: false,
    speed: 0,
  },
]

/** 拖拽数据类型（HTML5 DataTransfer） */
export const ELEMENT_DRAG_TYPE = 'application/x-wmdg-element'

/** 尺寸预设（属性面板） */
export const SIZE_PRESETS: { label: string; length: number; width: number; height: number }[] = [
  { label: '轿车 4.6×1.8×1.5', length: 4.6, width: 1.8, height: 1.5 },
  { label: 'SUV 4.8×1.9×1.7', length: 4.8, width: 1.9, height: 1.7 },
  { label: '货车 8.5×2.5×3.4', length: 8.5, width: 2.5, height: 3.4 },
  { label: '公交车 12×2.5×3.2', length: 12, width: 2.5, height: 3.2 },
  { label: '两轮车 2.0×0.8×1.5', length: 2, width: 0.8, height: 1.5 },
  { label: '行人 0.5×0.5×1.7', length: 0.5, width: 0.5, height: 1.7 },
]

/** 各类实体可选的类别值（OpenSCENARIO 枚举） */
export const CATEGORY_OPTIONS: Record<EntityKind, { value: string; label: string }[]> = {
  vehicle: [
    { value: 'car', label: '轿车 car' },
    { value: 'van', label: '厢式车 van' },
    { value: 'truck', label: '货车 truck' },
    { value: 'semitrailer', label: '半挂车 semitrailer' },
    { value: 'bus', label: '公交车 bus' },
    { value: 'motorbike', label: '摩托车 motorbike' },
    { value: 'bicycle', label: '自行车 bicycle' },
    { value: 'tram', label: '有轨电车 tram' },
  ],
  pedestrian: [
    { value: 'pedestrian', label: '行人 pedestrian' },
    { value: 'wheelchair', label: '轮椅 wheelchair' },
    { value: 'animal', label: '动物 animal' },
  ],
  misc: [
    { value: 'obstacle', label: '障碍物 obstacle' },
    { value: 'barrier', label: '护栏 barrier' },
    { value: 'pole', label: '杆 pole' },
    { value: 'tree', label: '树 tree' },
    { value: 'building', label: '建筑 building' },
    { value: 'none', label: '其他 none' },
  ],
}
