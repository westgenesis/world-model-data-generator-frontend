import type { LaneMesh } from '../../core/opendrive/lanes'

/** 画布配色：Konva 不读取 CSS 变量，按亮 / 暗主题给出具体色值（与 styles/index.css 中的 token 对应） */
export const CANVAS_PALETTE = {
  light: {
    bg: '#eef1f5',
    driving: '#5b6472',
    junction: '#666f7d',
    sidewalk: '#c4cad3',
    shoulder: '#9aa3ae',
    other: '#b5bcc6',
    hover: '#0a9ee0',
    white: '#ffffff',
    yellow: '#f5c518',
    vehicle: '#0a9ee0',
    pedestrian: '#f79009',
    misc: '#7a5af8',
    label: '#111827',
    labelBg: 'rgba(255,255,255,0.85)',
    selected: '#f04438',
    trajectory: '#0a9ee0',
    trajectoryMuted: 'rgba(10,158,224,0.45)',
    keyframe: '#ffffff',
    glass: 'rgba(23,32,48,0.82)',
    headlight: '#fff4c2',
    taillight: '#f04438',
    tire: '#1f2430',
    cone: '#f97316',
    tree: '#2f9e6e',
    police: '#1d4ed8',
    ambulance: '#f4f6f9',
    fire: '#d92d20',
    rescue: '#f5a524',
    military: '#5f6f3a',
    siren: '#f04438',
    sirenBlue: '#2563eb',
    sign: '#15803d',
    island: '#8fa37d',
    marking: 'rgba(255,255,255,0.92)',
    ego: '#2563eb',
    sensorCamera: '#0ea5e9',
    sensorLidar: '#a855f7',
    sensorRadar: '#f59e0b',
  },
  dark: {
    bg: '#0b0f17',
    driving: '#2a3240',
    junction: '#303948',
    sidewalk: '#4a5262',
    shoulder: '#3a4352',
    other: '#3f4756',
    hover: '#2bb3f0',
    white: '#d9dee6',
    yellow: '#e5b80b',
    vehicle: '#2bb3f0',
    pedestrian: '#fdb022',
    misc: '#9b8afb',
    label: '#e6eaf0',
    labelBg: 'rgba(18,24,35,0.85)',
    selected: '#f97066',
    trajectory: '#2bb3f0',
    trajectoryMuted: 'rgba(43,179,240,0.45)',
    keyframe: '#121823',
    glass: 'rgba(4,8,15,0.78)',
    headlight: '#fff1b0',
    taillight: '#f97066',
    tire: '#0b0e14',
    cone: '#fb923c',
    tree: '#3fb47e',
    police: '#3b82f6',
    ambulance: '#d9dee6',
    fire: '#f04438',
    rescue: '#fdb022',
    military: '#7a8a4a',
    siren: '#f97066',
    sirenBlue: '#60a5fa',
    sign: '#22a35a',
    island: '#4f5f45',
    marking: 'rgba(217,222,230,0.9)',
    ego: '#60a5fa',
    sensorCamera: '#38bdf8',
    sensorLidar: '#c084fc',
    sensorRadar: '#fbbf24',
  },
} as const

/** 当前主题的画布配色 */
export type CanvasColors = (typeof CANVAS_PALETTE)[keyof typeof CANVAS_PALETTE]

const DRIVING = new Set([
  'driving',
  'entry',
  'exit',
  'onRamp',
  'offRamp',
  'connectingRamp',
  'bidirectional',
])
const WALKING = new Set(['sidewalk', 'walking', 'crosswalk'])
const EDGE = new Set(['shoulder', 'border', 'curb', 'median', 'restricted'])

/**
 * 按车道类型取填充色
 * @param lane - 车道
 * @param colors - 当前配色
 * @returns 颜色
 */
export const laneFill = (lane: LaneMesh, colors: CanvasColors) => {
  if (DRIVING.has(lane.type)) return lane.inJunction ? colors.junction : colors.driving
  if (WALKING.has(lane.type)) return colors.sidewalk
  if (EDGE.has(lane.type)) return colors.shoulder
  return colors.other
}
