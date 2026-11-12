import type { LucideIcon } from 'lucide-react'
import {
  Accessibility,
  Ambulance,
  ArrowBigUp,
  Baby,
  Bike,
  Box,
  BrickWall,
  Building2,
  Bus,
  Car,
  CarFront,
  Caravan,
  Container,
  Dog,
  Fence,
  Flame,
  Footprints,
  LampFloor,
  LandPlot,
  Motorbike,
  Package,
  PawPrint,
  PersonStanding,
  Shield,
  Shrub,
  Signpost,
  SignpostBig,
  Siren,
  SquareDashed,
  SquareParking,
  TrafficCone,
  TrainFront,
  TramFront,
  TreeDeciduous,
  Truck,
  Van,
  Wrench,
} from 'lucide-react'
import type { EntityKind } from '../core/openscenario/types'

/** 元件库分组（按显示顺序） */
export const ELEMENT_GROUPS = [
  '机动车',
  '特种车辆',
  '非机动车与行人',
  '障碍物',
  '道路设施',
  '地面标记',
  '环境',
] as const

/** 元件分组名 */
export type ElementGroup = (typeof ELEMENT_GROUPS)[number]

/** 元件库中的一种目标物 */
export interface SceneElement {
  id: string
  label: string
  icon: LucideIcon
  group: ElementGroup
  kind: EntityKind
  /** 写入 vehicleCategory / pedestrianCategory / miscObjectCategory 的值 */
  category: string
  /** 角色（OpenSCENARIO 1.2+）：写入时文件会升级到 1.2 */
  role?: string
  /** 新实体名前缀，如 Car → Car1 */
  prefix: string
  length: number
  width: number
  height: number
  /** 车辆最大速度（m/s），省略时用默认值 */
  maxSpeed?: number
  /** 是否默认作为动态目标（可编辑轨迹） */
  dynamic: boolean
  /** 额外的搜索关键字 */
  keywords?: string
}

type Size = [length: number, width: number, height: number]
type Extra = Partial<Pick<SceneElement, 'role' | 'maxSpeed' | 'keywords'>>

/**
 * 创建某一分组的元件构造函数：车辆 / 行人默认为动态目标，静态物体默认为静态
 * @param group - 分组
 * @param kind - 实体类别
 * @returns 元件构造函数
 */
const itemOf =
  (group: ElementGroup, kind: EntityKind) =>
  (
    id: string,
    label: string,
    icon: LucideIcon,
    category: string,
    prefix: string,
    [length, width, height]: Size,
    extra: Extra = {},
  ): SceneElement => ({
    id,
    label,
    icon,
    group,
    kind,
    category,
    prefix,
    length,
    width,
    height,
    dynamic: kind !== 'misc',
    ...extra,
  })

const motor = itemOf('机动车', 'vehicle')
const special = itemOf('特种车辆', 'vehicle')
const rider = itemOf('非机动车与行人', 'vehicle')
const walker = itemOf('非机动车与行人', 'pedestrian')
const obstacle = itemOf('障碍物', 'misc')
const facility = itemOf('道路设施', 'misc')
const marking = itemOf('地面标记', 'misc')
const nature = itemOf('环境', 'misc')

/** 元件库：覆盖 OpenSCENARIO 1.1 的全部实体类别（已废弃的 wind 除外）与 1.2 的车辆角色 */
export const SCENE_ELEMENTS: SceneElement[] = [
  motor('car', '轿车', Car, 'car', 'Car', [4.6, 1.8, 1.5], { keywords: 'sedan 小汽车' }),
  motor('suv', 'SUV', CarFront, 'car', 'Suv', [4.8, 1.9, 1.7], { keywords: '越野' }),
  motor('van', '厢式车', Van, 'van', 'Van', [5.2, 2.0, 2.2], { keywords: '面包车 mpv' }),
  motor('truck', '货车', Truck, 'truck', 'Truck', [8.5, 2.5, 3.4], {
    maxSpeed: 33.3,
    keywords: '卡车',
  }),
  motor('semitrailer', '半挂车', Container, 'semitrailer', 'Semi', [16.5, 2.55, 4.0], {
    maxSpeed: 27.8,
    keywords: '牵引车 集装箱',
  }),
  motor('trailer', '挂车', Caravan, 'trailer', 'Trailer', [7, 2.5, 3.2], {
    maxSpeed: 27.8,
    keywords: '拖车 房车',
  }),
  motor('bus', '公交车', Bus, 'bus', 'Bus', [12, 2.5, 3.2], {
    maxSpeed: 27.8,
    keywords: '客车 大巴',
  }),
  motor('tram', '有轨电车', TramFront, 'tram', 'Tram', [30, 2.65, 3.5], {
    maxSpeed: 22.2,
    keywords: '电车',
  }),
  motor('train', '火车', TrainFront, 'train', 'Train', [50, 3.0, 4.0], {
    maxSpeed: 44.4,
    keywords: '列车 铁路',
  }),

  special('police', '警车', Siren, 'car', 'Police', [4.8, 1.85, 1.5], { role: 'police' }),
  special('ambulance', '救护车', Ambulance, 'van', 'Ambulance', [5.6, 2.0, 2.5], {
    role: 'ambulance',
  }),
  special('fire', '消防车', Flame, 'truck', 'FireTruck', [9, 2.5, 3.4], {
    role: 'fire',
    maxSpeed: 30.6,
  }),
  special('road-assistance', '道路救援', Wrench, 'truck', 'Rescue', [7.5, 2.4, 3.0], {
    role: 'roadAssistance',
    maxSpeed: 30.6,
    keywords: '清障车 拖车',
  }),
  special('military', '军车', Shield, 'truck', 'Military', [7, 2.5, 3.0], {
    role: 'military',
    maxSpeed: 25,
  }),

  rider('motorbike', '摩托车', Motorbike, 'motorbike', 'Moto', [2, 0.8, 1.5], {
    maxSpeed: 33.3,
    keywords: '电动车 两轮',
  }),
  rider('bicycle', '自行车', Bike, 'bicycle', 'Bike', [1.8, 0.6, 1.7], {
    maxSpeed: 12,
    keywords: '单车 两轮',
  }),
  walker('pedestrian', '行人', PersonStanding, 'pedestrian', 'Ped', [0.5, 0.5, 1.7], {
    keywords: '成人',
  }),
  walker('child', '儿童', Baby, 'pedestrian', 'Child', [0.4, 0.4, 1.2], { keywords: '小孩' }),
  walker('wheelchair', '轮椅', Accessibility, 'wheelchair', 'Wheelchair', [1.1, 0.7, 1.3]),
  walker('dog', '犬', Dog, 'animal', 'Dog', [0.9, 0.35, 0.6], { keywords: '狗 动物' }),
  walker('large-animal', '大型动物', PawPrint, 'animal', 'Animal', [1.8, 0.6, 1.4], {
    keywords: '鹿 牛',
  }),

  obstacle('cone', '锥桶', TrafficCone, 'obstacle', 'Cone', [0.4, 0.4, 0.7], { keywords: '路锥' }),
  obstacle('box', '箱体', Package, 'obstacle', 'Box', [1, 1, 1], { keywords: '纸箱 遗撒物' }),
  obstacle('barrier', '护栏', Fence, 'barrier', 'Barrier', [3, 0.4, 1], { keywords: '水马 隔离' }),
  obstacle('railing', '栏杆', Fence, 'railing', 'Railing', [4, 0.1, 1.1], { keywords: '扶手' }),
  obstacle('sound-barrier', '隔音墙', BrickWall, 'soundBarrier', 'SoundBarrier', [10, 0.3, 4], {
    keywords: '声屏障 墙',
  }),

  facility('pole', '杆', Signpost, 'pole', 'Pole', [0.2, 0.2, 3], { keywords: '立柱 标志杆' }),
  facility('street-lamp', '路灯', LampFloor, 'streetLamp', 'Lamp', [0.3, 0.3, 8]),
  facility('gantry', '龙门架', SignpostBig, 'gantry', 'Gantry', [1, 12, 6], {
    keywords: '门架 标志牌',
  }),
  facility('traffic-island', '交通岛', LandPlot, 'trafficIsland', 'Island', [10, 3, 0.2], {
    keywords: '安全岛 隔离带',
  }),
  facility('parking-space', '停车位', SquareParking, 'parkingSpace', 'Parking', [5, 2.5, 0.01], {
    keywords: '车位',
  }),
  facility('building', '建筑', Building2, 'building', 'Building', [15, 10, 10], {
    keywords: '房屋 楼',
  }),

  marking('crosswalk', '人行横道', Footprints, 'crosswalk', 'Crosswalk', [3, 8, 0.01], {
    keywords: '斑马线',
  }),
  marking('road-mark', '路面标记', ArrowBigUp, 'roadMark', 'RoadMark', [3, 1, 0.01], {
    keywords: '箭头 导向',
  }),
  marking('patch', '路面区域', SquareDashed, 'patch', 'Patch', [4, 3, 0.01], {
    keywords: '积水 坑洼 修补',
  }),

  nature('tree', '树', TreeDeciduous, 'tree', 'Tree', [4, 4, 6]),
  nature('vegetation', '灌木', Shrub, 'vegetation', 'Bush', [2, 2, 1], { keywords: '植被 绿化' }),
  nature('other', '其他', Box, 'none', 'Object', [1, 1, 1], { keywords: 'none' }),
]

/** 因角色属性把场景升级到 1.2 时的提示 */
export const UPGRADE_NOTICE = '已将场景升级为 OpenSCENARIO 1.2（角色属性需要 1.2 及以上）'

/** 拖拽数据类型（HTML5 DataTransfer） */
export const ELEMENT_DRAG_TYPE = 'application/x-wmdg-element'

/** 尺寸预设（属性面板） */
export const SIZE_PRESETS: { label: string; length: number; width: number; height: number }[] = [
  { label: '轿车 4.6×1.8×1.5', length: 4.6, width: 1.8, height: 1.5 },
  { label: 'SUV 4.8×1.9×1.7', length: 4.8, width: 1.9, height: 1.7 },
  { label: '厢式车 5.2×2.0×2.2', length: 5.2, width: 2.0, height: 2.2 },
  { label: '货车 8.5×2.5×3.4', length: 8.5, width: 2.5, height: 3.4 },
  { label: '半挂车 16.5×2.55×4.0', length: 16.5, width: 2.55, height: 4.0 },
  { label: '公交车 12×2.5×3.2', length: 12, width: 2.5, height: 3.2 },
  { label: '两轮车 2.0×0.8×1.5', length: 2, width: 0.8, height: 1.5 },
  { label: '行人 0.5×0.5×1.7', length: 0.5, width: 0.5, height: 1.7 },
  { label: '儿童 0.4×0.4×1.2', length: 0.4, width: 0.4, height: 1.2 },
]

/** 各类实体可选的类别值（OpenSCENARIO 1.1 枚举，已废弃的 wind 除外） */
export const CATEGORY_OPTIONS: Record<EntityKind, { value: string; label: string }[]> = {
  vehicle: [
    { value: 'car', label: '轿车 car' },
    { value: 'van', label: '厢式车 van' },
    { value: 'truck', label: '货车 truck' },
    { value: 'trailer', label: '挂车 trailer' },
    { value: 'semitrailer', label: '半挂车 semitrailer' },
    { value: 'bus', label: '公交车 bus' },
    { value: 'motorbike', label: '摩托车 motorbike' },
    { value: 'bicycle', label: '自行车 bicycle' },
    { value: 'train', label: '火车 train' },
    { value: 'tram', label: '有轨电车 tram' },
  ],
  pedestrian: [
    { value: 'pedestrian', label: '行人 pedestrian' },
    { value: 'wheelchair', label: '轮椅 wheelchair' },
    { value: 'animal', label: '动物 animal' },
  ],
  misc: [
    { value: 'none', label: '其他 none' },
    { value: 'obstacle', label: '障碍物 obstacle' },
    { value: 'pole', label: '杆 pole' },
    { value: 'tree', label: '树 tree' },
    { value: 'vegetation', label: '植被 vegetation' },
    { value: 'barrier', label: '护栏 barrier' },
    { value: 'building', label: '建筑 building' },
    { value: 'parkingSpace', label: '停车位 parkingSpace' },
    { value: 'patch', label: '路面区域 patch' },
    { value: 'railing', label: '栏杆 railing' },
    { value: 'trafficIsland', label: '交通岛 trafficIsland' },
    { value: 'crosswalk', label: '人行横道 crosswalk' },
    { value: 'streetLamp', label: '路灯 streetLamp' },
    { value: 'gantry', label: '龙门架 gantry' },
    { value: 'soundBarrier', label: '隔音墙 soundBarrier' },
    { value: 'roadMark', label: '路面标记 roadMark' },
  ],
}

/** 角色可选值（OpenSCENARIO 1.2 Role 枚举）；空串表示不设置 */
export const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '不设置' },
  { value: 'none', label: '无 none' },
  { value: 'civil', label: '民用 civil' },
  { value: 'police', label: '警车 police' },
  { value: 'ambulance', label: '救护 ambulance' },
  { value: 'fire', label: '消防 fire' },
  { value: 'roadAssistance', label: '道路救援 roadAssistance' },
  { value: 'military', label: '军用 military' },
  { value: 'publicTransport', label: '公共交通 publicTransport' },
]
