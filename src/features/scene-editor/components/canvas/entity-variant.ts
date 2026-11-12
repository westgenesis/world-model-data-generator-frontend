import type { OscEntity } from '../../core/openscenario/types'

/** 俯视轮廓的种类 */
export type ShapeVariant =
  | 'sedan'
  | 'suv'
  | 'van'
  | 'truck'
  | 'semitrailer'
  | 'trailer'
  | 'bus'
  | 'tram'
  | 'train'
  | 'motorbike'
  | 'bicycle'
  | 'pedestrian'
  | 'wheelchair'
  | 'animal'
  | 'cone'
  | 'box'
  | 'barrier'
  | 'railing'
  | 'wall'
  | 'pole'
  | 'lamp'
  | 'gantry'
  | 'building'
  | 'tree'
  | 'bush'
  | 'crosswalk'
  | 'roadMark'
  | 'patch'
  | 'parking'
  | 'island'

/** 静态物体类别（小写）→ 轮廓 */
const MISC_VARIANTS: Record<string, ShapeVariant> = {
  barrier: 'barrier',
  fence: 'barrier',
  railing: 'railing',
  soundbarrier: 'wall',
  wall: 'wall',
  pole: 'pole',
  trafficsign: 'pole',
  trafficlight: 'pole',
  streetlamp: 'lamp',
  gantry: 'gantry',
  building: 'building',
  tree: 'tree',
  vegetation: 'bush',
  crosswalk: 'crosswalk',
  roadmark: 'roadMark',
  patch: 'patch',
  parkingspace: 'parking',
  trafficisland: 'island',
}

/** 车辆类别 → 轮廓（car 按车高区分轿车 / SUV） */
const VEHICLE_VARIANTS: Record<string, ShapeVariant> = {
  van: 'van',
  truck: 'truck',
  semitrailer: 'semitrailer',
  trailer: 'trailer',
  bus: 'bus',
  tram: 'tram',
  train: 'train',
  motorbike: 'motorbike',
  bicycle: 'bicycle',
}

/** 贴地的标记类轮廓：先于其他目标物绘制，避免盖住车辆和行人 */
const GROUND_VARIANTS = new Set<ShapeVariant>([
  'crosswalk',
  'roadMark',
  'patch',
  'parking',
  'island',
])

/**
 * 按实体类别与尺寸选择俯视轮廓
 * @param entity - 场景实体
 * @returns 轮廓种类
 */
export const shapeVariant = (
  entity: Pick<OscEntity, 'kind' | 'category' | 'length' | 'width' | 'height'>,
): ShapeVariant => {
  const category = entity.category.toLowerCase()
  if (entity.kind === 'vehicle') {
    // 轿车类别里较高的车型（如元件库中的 SUV）按 SUV 绘制
    return VEHICLE_VARIANTS[category] ?? (entity.height >= 1.65 ? 'suv' : 'sedan')
  }
  if (entity.kind === 'pedestrian') {
    if (category === 'wheelchair') return 'wheelchair'
    if (category === 'animal') return 'animal'
    return 'pedestrian'
  }
  const known = MISC_VARIANTS[category]
  if (known) return known
  // 小尺寸障碍物（≤ 1 m）按锥桶绘制
  if (category === 'obstacle' && Math.max(entity.length, entity.width) <= 1) return 'cone'
  return 'box'
}

/**
 * 是否为贴地的标记类目标物（人行横道、路面标记、停车位等）
 * @param entity - 场景实体
 * @returns 是否贴地
 */
export const isGroundEntity = (
  entity: Pick<OscEntity, 'kind' | 'category' | 'length' | 'width' | 'height'>,
) => GROUND_VARIANTS.has(shapeVariant(entity))
