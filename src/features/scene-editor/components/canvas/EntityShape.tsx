import type { ReactNode } from 'react'
import { Circle, Ellipse, Group, Line, Rect } from 'react-konva'
import type { OscEntity } from '../../core/openscenario/types'
import type { CanvasColors } from './palette'

/** 俯视轮廓的种类 */
export type ShapeVariant =
  | 'sedan'
  | 'suv'
  | 'truck'
  | 'semitrailer'
  | 'bus'
  | 'motorbike'
  | 'bicycle'
  | 'pedestrian'
  | 'wheelchair'
  | 'animal'
  | 'cone'
  | 'barrier'
  | 'pole'
  | 'tree'
  | 'box'

/**
 * 按实体类别与尺寸选择俯视轮廓
 * @param entity - 场景实体
 * @returns 轮廓种类
 */
const shapeVariant = (
  entity: Pick<OscEntity, 'kind' | 'category' | 'length' | 'width' | 'height'>,
): ShapeVariant => {
  const category = entity.category.toLowerCase()
  if (entity.kind === 'vehicle') {
    if (category === 'van') return 'suv'
    if (category === 'truck') return 'truck'
    if (category === 'semitrailer' || category === 'trailer') return 'semitrailer'
    if (category === 'bus' || category === 'tram' || category === 'train') return 'bus'
    if (category === 'motorbike') return 'motorbike'
    if (category === 'bicycle') return 'bicycle'
    // 轿车类别里较高的车型（如元件库中的 SUV）按 SUV 绘制
    return entity.height >= 1.65 ? 'suv' : 'sedan'
  }
  if (entity.kind === 'pedestrian') {
    if (category === 'wheelchair') return 'wheelchair'
    if (category === 'animal') return 'animal'
    return 'pedestrian'
  }
  if (['barrier', 'railing', 'soundbarrier', 'fence', 'wall'].includes(category)) return 'barrier'
  if (['pole', 'streetlamp', 'trafficsign', 'trafficlight'].includes(category)) return 'pole'
  if (category === 'tree' || category === 'vegetation') return 'tree'
  // 小尺寸障碍物（≤ 1 m）按锥桶绘制
  if (category === 'obstacle' && Math.max(entity.length, entity.width) <= 1) return 'cone'
  return 'box'
}

/** 归一化坐标 [u, v]：u 沿车长（-0.5 车尾 → 0.5 车头），v 沿车宽（-0.5 → 0.5） */
type UV = [number, number]

interface EntityShapeProps {
  entity: OscEntity
  colors: CanvasColors
  active: boolean
  /** 一个屏幕像素对应的世界长度（米） */
  px: number
}

/**
 * 目标物的俯视轮廓：按包围盒尺寸缩放，车头朝 +x。
 * 坐标系与父级实体 Group 一致（原点为参考点，包围盒中心位于 x = centerX）。
 */
export const EntityShape = ({ entity, colors, active, px }: EntityShapeProps) => {
  const { length: L, width: W, centerX: cx } = entity
  const min = Math.min(L, W)
  const body = colors[entity.kind]
  const outline = { stroke: colors.white, strokeWidth: 1, strokeScaleEnabled: false }

  /** 归一化矩形 */
  const rect = (
    key: string,
    u0: number,
    u1: number,
    v0: number,
    v1: number,
    fill: string,
    extra: object = {},
  ) => (
    <Rect
      key={key}
      x={cx + u0 * L}
      y={v0 * W}
      width={(u1 - u0) * L}
      height={(v1 - v0) * W}
      fill={fill}
      {...extra}
    />
  )
  /** 归一化多边形 */
  const poly = (key: string, pts: UV[], fill: string, extra: object = {}) => (
    <Line
      key={key}
      closed
      points={pts.flatMap(([u, v]) => [cx + u * L, v * W])}
      fill={fill}
      {...extra}
    />
  )
  /** 左右对称的一对矩形（v0 < v1，均为正值） */
  const pair = (
    key: string,
    u0: number,
    u1: number,
    v0: number,
    v1: number,
    fill: string,
    extra: object = {},
  ) => [
    rect(`${key}-l`, u0, u1, v0, v1, fill, extra),
    rect(`${key}-r`, u0, u1, -v1, -v0, fill, extra),
  ]
  /** 车身：前后圆角不同（Konva 圆角顺序为 左上、右上、右下、左下，x 正向为车头） */
  const hull = (key: string, u0: number, u1: number, rear: number, front: number, fill = body) => {
    const limit = Math.min(((u1 - u0) * L) / 2, W / 2)
    const r = Math.min(rear, limit)
    const f = Math.min(front, limit)
    return rect(key, u0, u1, -0.5, 0.5, fill, { cornerRadius: [r, f, f, r], ...outline })
  }
  const lights = (u = 0.465) => [
    ...pair('hl', u, 0.495, 0.24, 0.42, colors.headlight),
    ...pair('tl', -0.495, -0.47, 0.26, 0.44, colors.taillight),
  ]
  const mirrors = (u: number) => [
    <Ellipse
      key="mr-l"
      x={cx + u * L}
      y={W / 2 + 0.06}
      radiusX={Math.min(0.035 * L, 0.16)}
      radiusY={Math.min(0.07 * W, 0.13)}
      fill={body}
      {...outline}
    />,
    <Ellipse
      key="mr-r"
      x={cx + u * L}
      y={-W / 2 - 0.06}
      radiusX={Math.min(0.035 * L, 0.16)}
      radiusY={Math.min(0.07 * W, 0.13)}
      fill={body}
      {...outline}
    />,
  ]

  const parts: Record<ShapeVariant, () => ReactNode[]> = {
    sedan: () => [
      ...mirrors(0.18),
      hull('body', -0.5, 0.5, W * 0.24, W * 0.36),
      poly(
        'windshield',
        [
          [0.27, -0.42],
          [0.27, 0.42],
          [0.09, 0.36],
          [0.09, -0.36],
        ],
        colors.glass,
      ),
      rect('roof', -0.2, 0.09, -0.36, 0.36, colors.white, {
        opacity: 0.16,
        cornerRadius: W * 0.06,
      }),
      ...pair('side', -0.18, 0.07, 0.38, 0.44, colors.glass),
      poly(
        'rear',
        [
          [-0.2, -0.36],
          [-0.2, 0.36],
          [-0.33, 0.4],
          [-0.33, -0.4],
        ],
        colors.glass,
      ),
      ...lights(),
    ],
    suv: () => [
      ...mirrors(0.2),
      hull('body', -0.5, 0.5, W * 0.16, W * 0.28),
      poly(
        'windshield',
        [
          [0.3, -0.43],
          [0.3, 0.43],
          [0.15, 0.38],
          [0.15, -0.38],
        ],
        colors.glass,
      ),
      rect('roof', -0.4, 0.15, -0.38, 0.38, colors.white, {
        opacity: 0.16,
        cornerRadius: W * 0.05,
      }),
      ...pair('rail', -0.36, 0.1, 0.28, 0.31, colors.white, { opacity: 0.5 }),
      ...pair('side', -0.36, 0.13, 0.4, 0.45, colors.glass),
      rect('rear', -0.46, -0.4, -0.38, 0.38, colors.glass),
      ...lights(),
    ],
    truck: () => [
      ...mirrors(0.42),
      rect('cargo', -0.5, 0.27, -0.5, 0.5, body, { cornerRadius: W * 0.04, ...outline }),
      rect('cargo-top', -0.48, 0.25, -0.44, 0.44, colors.white, { opacity: 0.22 }),
      ...[-0.3, -0.1, 0.1].map((u, i) =>
        rect(`rib-${i}`, u, u + 0.008, -0.44, 0.44, colors.white, { opacity: 0.45 }),
      ),
      hull('cab', 0.29, 0.5, W * 0.06, W * 0.2),
      poly(
        'windshield',
        [
          [0.47, -0.43],
          [0.47, 0.43],
          [0.42, 0.4],
          [0.42, -0.4],
        ],
        colors.glass,
      ),
      rect('cab-roof', 0.31, 0.41, -0.38, 0.38, colors.white, { opacity: 0.18 }),
      ...lights(0.485),
    ],
    semitrailer: () => [
      ...mirrors(0.45),
      rect('trailer', -0.5, 0.33, -0.48, 0.48, body, { cornerRadius: W * 0.04, ...outline }),
      rect('trailer-top', -0.485, 0.315, -0.42, 0.42, colors.white, { opacity: 0.22 }),
      ...[-0.3, -0.1, 0.1].map((u, i) =>
        rect(`rib-${i}`, u, u + 0.006, -0.42, 0.42, colors.white, { opacity: 0.45 }),
      ),
      hull('cab', 0.355, 0.5, W * 0.06, W * 0.2),
      poly(
        'windshield',
        [
          [0.48, -0.43],
          [0.48, 0.43],
          [0.445, 0.4],
          [0.445, -0.4],
        ],
        colors.glass,
      ),
      ...lights(0.49),
    ],
    bus: () => [
      ...mirrors(0.47),
      hull('body', -0.5, 0.5, W * 0.1, W * 0.14),
      rect('windshield', 0.44, 0.485, -0.44, 0.44, colors.glass),
      ...pair('side', -0.46, 0.42, 0.37, 0.45, colors.glass),
      rect('rear', -0.49, -0.465, -0.36, 0.36, colors.glass),
      rect('ac-1', 0.08, 0.24, -0.22, 0.22, colors.white, {
        opacity: 0.35,
        cornerRadius: W * 0.04,
      }),
      rect('ac-2', -0.3, -0.18, -0.22, 0.22, colors.white, {
        opacity: 0.35,
        cornerRadius: W * 0.04,
      }),
      ...lights(0.49),
    ],
    motorbike: () => [
      rect('front-tire', 0.3, 0.5, -0.09, 0.09, colors.tire, { cornerRadius: W * 0.08 }),
      rect('rear-tire', -0.5, -0.27, -0.11, 0.11, colors.tire, { cornerRadius: W * 0.08 }),
      <Ellipse
        key="body"
        x={cx + 0.02 * L}
        y={0}
        radiusX={0.3 * L}
        radiusY={0.24 * W}
        fill={body}
        {...outline}
      />,
      rect('bar', 0.24, 0.28, -0.46, 0.46, colors.tire, { cornerRadius: W * 0.02 }),
      <Ellipse
        key="rider"
        x={cx - 0.06 * L}
        y={0}
        radiusX={0.08 * L}
        radiusY={0.36 * W}
        fill={body}
        {...outline}
      />,
      <Circle
        key="helmet"
        x={cx - 0.02 * L}
        y={0}
        radius={0.17 * W}
        fill={colors.glass}
        {...outline}
      />,
      rect('headlight', 0.47, 0.5, -0.06, 0.06, colors.headlight),
    ],
    bicycle: () => [
      rect('front-tire', 0.2, 0.5, -0.05, 0.05, colors.tire, { cornerRadius: W * 0.05 }),
      rect('rear-tire', -0.5, -0.2, -0.05, 0.05, colors.tire, { cornerRadius: W * 0.05 }),
      rect('frame', -0.22, 0.24, -0.04, 0.04, body),
      rect('bar', 0.24, 0.28, -0.48, 0.48, colors.tire, { cornerRadius: W * 0.02 }),
      <Ellipse
        key="rider"
        x={cx - 0.08 * L}
        y={0}
        radiusX={0.07 * L}
        radiusY={0.42 * W}
        fill={body}
        {...outline}
      />,
      <Circle key="head" x={cx - 0.04 * L} y={0} radius={0.2 * W} fill={body} {...outline} />,
    ],
    pedestrian: () => [
      <Ellipse
        key="arms"
        x={cx - 0.02 * L}
        y={0}
        radiusX={0.18 * L}
        radiusY={0.5 * W}
        fill={body}
        opacity={0.55}
      />,
      <Ellipse
        key="torso"
        x={cx - 0.04 * L}
        y={0}
        radiusX={0.24 * L}
        radiusY={0.4 * W}
        fill={body}
        {...outline}
      />,
      <Circle key="head" x={cx + 0.06 * L} y={0} radius={0.22 * min} fill={body} {...outline} />,
      poly(
        'nose',
        [
          [0.26, -0.06],
          [0.26, 0.06],
          [0.36, 0],
        ],
        colors.white,
        { opacity: 0.9 },
      ),
    ],
    wheelchair: () => [
      ...pair('wheel', -0.3, 0.2, 0.38, 0.5, colors.tire, { cornerRadius: W * 0.04 }),
      rect('seat', -0.32, 0.22, -0.36, 0.36, body, { cornerRadius: W * 0.06, ...outline }),
      ...pair('foot', 0.22, 0.46, 0.12, 0.26, colors.tire),
      <Circle key="head" x={cx - 0.08 * L} y={0} radius={0.18 * min} fill={body} {...outline} />,
    ],
    animal: () => [
      <Ellipse
        key="body"
        x={cx - 0.08 * L}
        y={0}
        radiusX={0.34 * L}
        radiusY={0.4 * W}
        fill={body}
        {...outline}
      />,
      <Circle key="head" x={cx + 0.36 * L} y={0} radius={0.28 * min} fill={body} {...outline} />,
      rect('tail', -0.5, -0.4, -0.05, 0.05, body),
    ],
    cone: () => [
      rect('base', -0.5, 0.5, -0.5, 0.5, colors.cone, {
        cornerRadius: min * 0.15,
        opacity: 0.85,
        ...outline,
      }),
      <Circle key="ring" x={cx} y={0} radius={0.34 * min} fill={colors.white} listening={false} />,
      <Circle key="top" x={cx} y={0} radius={0.2 * min} fill={colors.cone} listening={false} />,
    ],
    barrier: () => {
      const n = Math.max(2, Math.round(L / 0.5))
      return [
        ...Array.from({ length: n }, (_, i) =>
          rect(
            `seg-${i}`,
            -0.5 + i / n,
            -0.5 + (i + 1) / n,
            -0.5,
            0.5,
            i % 2 ? colors.white : colors.taillight,
          ),
        ),
        rect('frame', -0.5, 0.5, -0.5, 0.5, 'transparent', outline),
      ]
    },
    pole: () => [
      <Circle key="pole" x={cx} y={0} radius={min / 2} fill={body} {...outline} />,
      <Circle key="top" x={cx} y={0} radius={min / 4} fill={colors.white} opacity={0.6} />,
    ],
    tree: () => [
      <Circle
        key="crown"
        x={cx}
        y={0}
        radius={min / 2}
        fill={colors.tree}
        opacity={0.8}
        {...outline}
      />,
      <Circle
        key="inner"
        x={cx - 0.08 * min}
        y={0.08 * min}
        radius={min / 4}
        fill={colors.white}
        opacity={0.18}
      />,
    ],
    box: () => [
      rect('box', -0.5, 0.5, -0.5, 0.5, body, { cornerRadius: min * 0.08, ...outline }),
      poly(
        'x1',
        [
          [-0.42, -0.42],
          [0.42, 0.42],
        ],
        'transparent',
        {
          closed: false,
          stroke: colors.white,
          strokeWidth: 1,
          strokeScaleEnabled: false,
          opacity: 0.6,
        },
      ),
      poly(
        'x2',
        [
          [-0.42, 0.42],
          [0.42, -0.42],
        ],
        'transparent',
        {
          closed: false,
          stroke: colors.white,
          strokeWidth: 1,
          strokeScaleEnabled: false,
          opacity: 0.6,
        },
      ),
    ],
  }

  // 选中框：包围盒外扩，保证小目标也清晰可见
  const pad = Math.max(0.25, 4 * px)
  return (
    <Group listening={false}>
      {parts[shapeVariant(entity)]()}
      {active && (
        <Rect
          x={cx - L / 2 - pad}
          y={-W / 2 - pad}
          width={L + pad * 2}
          height={W + pad * 2}
          cornerRadius={pad}
          stroke={colors.selected}
          strokeWidth={2}
          strokeScaleEnabled={false}
          shadowColor={colors.selected}
          shadowBlur={10}
          shadowOpacity={0.6}
        />
      )}
    </Group>
  )
}
