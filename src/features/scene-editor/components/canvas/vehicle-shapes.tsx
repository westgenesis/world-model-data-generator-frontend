import type { ReactNode } from 'react'
import type { ShapeVariant } from './entity-variant'
import type { CanvasColors } from './palette'
import type { ShapeContext, ShapeKit, UV } from './shape-kit'

type Parts = (kit: ShapeKit, ctx: ShapeContext) => ReactNode[]

/**
 * 货厢顶部的横向加强筋
 * @param kit - 绘图辅助函数
 * @param ctx - 绘制上下文
 * @param us - 各加强筋的 u 坐标
 * @param span - 横向半宽（归一化）
 * @returns 图形
 */
const ribs = (kit: ShapeKit, ctx: ShapeContext, us: number[], span: number) =>
  us.map((u, i) =>
    kit.rect(`rib-${i}`, u, u + 0.06 / ctx.L, -span, span, ctx.colors.white, { opacity: 0.45 }),
  )

/**
 * 前窄后宽的梯形风挡
 * @param front - 前沿 u
 * @param back - 后沿 u
 * @param wide - 前沿半宽
 * @param narrow - 后沿半宽
 * @returns 顶点
 */
const trapezoid = (front: number, back: number, wide: number, narrow: number): UV[] => [
  [front, -wide],
  [front, wide],
  [back, narrow],
  [back, -narrow],
]

/**
 * 分节车厢（有轨电车 / 火车）：节间留出连接缝，侧面连续车窗
 * @param kit - 绘图辅助函数
 * @param ctx - 绘制上下文
 * @param segment - 每节长度（米）
 * @param bothEnds - 两端是否都是驾驶室（有轨电车为双向）
 * @returns 图形
 */
const articulated = (kit: ShapeKit, ctx: ShapeContext, segment: number, bothEnds: boolean) => {
  const { L, W, colors } = ctx
  const n = Math.max(2, Math.round(L / segment))
  const gap = Math.min(0.5, L / n / 10) / L
  const parts: ReactNode[] = []
  for (let i = 0; i < n; i++) {
    const u0 = -0.5 + i / n + (i > 0 ? gap / 2 : 0)
    const u1 = -0.5 + (i + 1) / n - (i < n - 1 ? gap / 2 : 0)
    const front = i === n - 1 ? W * (bothEnds ? 0.2 : 0.45) : W * 0.06
    const rear = i === 0 ? W * (bothEnds ? 0.2 : 0.1) : W * 0.06
    parts.push(kit.hull(`car-${i}`, u0, u1, rear, front))
    parts.push(...kit.pair(`win-${i}`, u0 + 0.3 / L, u1 - 0.3 / L, 0.37, 0.45, colors.glass))
    parts.push(
      kit.rect(`roof-${i}`, u0 + 0.5 / L, u1 - 0.5 / L, -0.2, 0.2, colors.white, { opacity: 0.18 }),
    )
    if (i < n - 1) parts.push(kit.rect(`joint-${i}`, u1, u1 + gap, -0.36, 0.36, colors.tire))
  }
  const glass = 0.5 / L
  const edge = 0.15 / L
  parts.push(kit.rect('front-glass', 0.5 - glass - edge, 0.5 - edge, -0.4, 0.4, colors.glass))
  if (bothEnds) {
    parts.push(kit.rect('rear-glass', -0.5 + edge, -0.5 + glass + edge, -0.4, 0.4, colors.glass))
  }
  // 受电弓
  parts.push(kit.rect('pantograph', -0.4 / L, 0.4 / L, -0.3, 0.3, colors.tire, { opacity: 0.8 }))
  return parts
}

/** 各车型的俯视轮廓 */
const VEHICLE_PARTS: Partial<Record<ShapeVariant, Parts>> = {
  sedan: (k, { W, colors }) => [
    ...k.mirrors(0.18),
    k.hull('body', -0.5, 0.5, W * 0.24, W * 0.36),
    k.poly('windshield', trapezoid(0.27, 0.09, 0.42, 0.36), colors.glass),
    k.rect('roof', -0.2, 0.09, -0.36, 0.36, colors.white, {
      opacity: 0.16,
      cornerRadius: W * 0.06,
    }),
    ...k.pair('side', -0.18, 0.07, 0.38, 0.44, colors.glass),
    k.poly('rear', trapezoid(-0.2, -0.33, 0.36, 0.4), colors.glass),
    ...k.lights(),
  ],
  suv: (k, { W, colors }) => [
    ...k.mirrors(0.2),
    k.hull('body', -0.5, 0.5, W * 0.16, W * 0.28),
    k.poly('windshield', trapezoid(0.3, 0.15, 0.43, 0.38), colors.glass),
    k.rect('roof', -0.4, 0.15, -0.38, 0.38, colors.white, {
      opacity: 0.16,
      cornerRadius: W * 0.05,
    }),
    ...k.pair('rail', -0.36, 0.1, 0.28, 0.31, colors.white, { opacity: 0.5 }),
    ...k.pair('side', -0.36, 0.13, 0.4, 0.45, colors.glass),
    k.rect('rear', -0.46, -0.4, -0.38, 0.38, colors.glass),
    ...k.lights(),
  ],
  van: (k, { W, colors }) => [
    ...k.mirrors(0.28),
    k.hull('body', -0.5, 0.5, W * 0.08, W * 0.3),
    k.poly('windshield', trapezoid(0.37, 0.24, 0.43, 0.4), colors.glass),
    k.rect('roof', -0.46, 0.24, -0.4, 0.4, colors.white, {
      opacity: 0.16,
      cornerRadius: W * 0.04,
    }),
    ...k.pair('side', -0.1, 0.22, 0.41, 0.46, colors.glass),
    k.rect('rear', -0.49, -0.465, -0.38, 0.38, colors.glass),
    ...k.lights(0.475),
  ],
  truck: (k, ctx) => [
    ...k.mirrors(0.42),
    k.rect('cargo', -0.5, 0.27, -0.5, 0.5, ctx.body, { cornerRadius: ctx.W * 0.04, ...k.outline }),
    k.rect('cargo-top', -0.48, 0.25, -0.44, 0.44, ctx.colors.white, { opacity: 0.22 }),
    ...ribs(k, ctx, [-0.3, -0.1, 0.1], 0.44),
    k.hull('cab', 0.29, 0.5, ctx.W * 0.06, ctx.W * 0.2),
    k.poly('windshield', trapezoid(0.47, 0.42, 0.43, 0.4), ctx.colors.glass),
    k.rect('cab-roof', 0.31, 0.41, -0.38, 0.38, ctx.colors.white, { opacity: 0.18 }),
    ...k.lights(0.485),
  ],
  semitrailer: (k, ctx) => [
    ...k.mirrors(0.45),
    k.rect('trailer', -0.5, 0.33, -0.48, 0.48, ctx.body, {
      cornerRadius: ctx.W * 0.04,
      ...k.outline,
    }),
    k.rect('trailer-top', -0.485, 0.315, -0.42, 0.42, ctx.colors.white, { opacity: 0.22 }),
    ...ribs(k, ctx, [-0.3, -0.1, 0.1], 0.42),
    k.hull('cab', 0.355, 0.5, ctx.W * 0.06, ctx.W * 0.2),
    k.poly('windshield', trapezoid(0.48, 0.445, 0.43, 0.4), ctx.colors.glass),
    ...k.lights(0.49),
  ],
  trailer: (k, ctx) => {
    // 牵引杆长约 1 m，计入包围盒
    const bar = Math.min(0.25, 1 / ctx.L)
    return [
      k.poly(
        'drawbar',
        [
          [0.5 - bar, -0.3],
          [0.5, -0.03],
          [0.5, 0.03],
          [0.5 - bar, 0.3],
        ],
        'transparent',
        { stroke: ctx.colors.tire, strokeWidth: 2, strokeScaleEnabled: false },
      ),
      k.rect('box', -0.5, 0.5 - bar, -0.5, 0.5, ctx.body, {
        cornerRadius: ctx.W * 0.05,
        ...k.outline,
      }),
      k.rect('top', -0.48, 0.48 - bar, -0.44, 0.44, ctx.colors.white, { opacity: 0.22 }),
      ...ribs(k, ctx, [-0.25, 0, 0.2], 0.44),
      ...k.pair('tl', -0.495, -0.47, 0.26, 0.44, ctx.colors.taillight),
    ]
  },
  bus: (k, { W, colors }) => [
    ...k.mirrors(0.47),
    k.hull('body', -0.5, 0.5, W * 0.1, W * 0.14),
    k.rect('windshield', 0.44, 0.485, -0.44, 0.44, colors.glass),
    ...k.pair('side', -0.46, 0.42, 0.37, 0.45, colors.glass),
    k.rect('rear', -0.49, -0.465, -0.36, 0.36, colors.glass),
    k.rect('ac-1', 0.08, 0.24, -0.22, 0.22, colors.white, {
      opacity: 0.35,
      cornerRadius: W * 0.04,
    }),
    k.rect('ac-2', -0.3, -0.18, -0.22, 0.22, colors.white, {
      opacity: 0.35,
      cornerRadius: W * 0.04,
    }),
    ...k.lights(0.49),
  ],
  tram: (k, ctx) => articulated(k, ctx, 10, true),
  train: (k, ctx) => articulated(k, ctx, 20, false),
  motorbike: (k, { L, W, body, colors }) => [
    k.rect('front-tire', 0.3, 0.5, -0.09, 0.09, colors.tire, { cornerRadius: W * 0.08 }),
    k.rect('rear-tire', -0.5, -0.27, -0.11, 0.11, colors.tire, { cornerRadius: W * 0.08 }),
    k.ellipse('body', 0.02, 0, 0.3 * L, 0.24 * W, body, k.outline),
    k.rect('bar', 0.24, 0.28, -0.46, 0.46, colors.tire, { cornerRadius: W * 0.02 }),
    k.ellipse('rider', -0.06, 0, 0.08 * L, 0.36 * W, body, k.outline),
    k.circle('helmet', -0.02, 0, 0.17 * W, colors.glass, k.outline),
    k.rect('headlight', 0.47, 0.5, -0.06, 0.06, colors.headlight),
  ],
  bicycle: (k, { L, W, body, colors }) => [
    k.rect('front-tire', 0.2, 0.5, -0.05, 0.05, colors.tire, { cornerRadius: W * 0.05 }),
    k.rect('rear-tire', -0.5, -0.2, -0.05, 0.05, colors.tire, { cornerRadius: W * 0.05 }),
    k.rect('frame', -0.22, 0.24, -0.04, 0.04, body),
    k.rect('bar', 0.24, 0.28, -0.48, 0.48, colors.tire, { cornerRadius: W * 0.02 }),
    k.ellipse('rider', -0.08, 0, 0.07 * L, 0.42 * W, body, k.outline),
    k.circle('head', -0.04, 0, 0.2 * W, body, k.outline),
  ],
}

/** 各车型的车顶中心（警灯、标识的位置）；未列出的车型不画角色标识 */
const ROOF_CENTER: Partial<Record<ShapeVariant, number>> = {
  sedan: -0.05,
  suv: -0.12,
  van: -0.1,
  truck: 0.36,
  semitrailer: 0.43,
  bus: 0,
}

/**
 * 角色车辆的主体颜色
 * @param role - 角色
 * @param colors - 画布配色
 * @returns 颜色；无特殊配色时返回 undefined
 */
export const roleBody = (role: string | undefined, colors: CanvasColors): string | undefined => {
  const map: Record<string, string> = {
    police: colors.police,
    ambulance: colors.ambulance,
    fire: colors.fire,
    roadAssistance: colors.rescue,
    military: colors.military,
  }
  return role ? map[role] : undefined
}

/**
 * 消防车车顶云梯：最长 5.5 m，且不超过车长的 60%
 * @param kit - 绘图辅助函数
 * @param ctx - 绘制上下文
 * @returns 图形
 */
const ladder = (kit: ShapeKit, ctx: ShapeContext) => {
  const m = (meters: number) => meters / ctx.L
  const len = Math.min(m(5.5), 0.6)
  const count = Math.max(2, Math.floor(len / m(0.5)))
  return [
    ...kit.pair('ladder', -0.42, -0.42 + len, 0.1, 0.13, ctx.colors.white, { opacity: 0.85 }),
    ...Array.from({ length: count }, (_, i) => {
      const u = -0.42 + (i * len) / count
      return kit.rect(`rung-${i}`, u, u + m(0.06), -0.12, 0.12, ctx.colors.white, {
        opacity: 0.75,
      })
    }),
  ]
}

/**
 * 角色车辆在车身上的标识：警灯、红十字、云梯、吊臂、迷彩
 * @param kit - 绘图辅助函数
 * @param ctx - 绘制上下文
 * @param variant - 轮廓种类
 * @param role - 角色
 * @returns 图形
 */
const roleParts = (
  kit: ShapeKit,
  ctx: ShapeContext,
  variant: ShapeVariant,
  role?: string,
): ReactNode[] => {
  const { L, W, colors } = ctx
  const roof = ROOF_CENTER[variant]
  if (roof === undefined || !role) return []
  const m = (meters: number) => meters / L
  if (role === 'police') {
    return [
      ...kit.pair('stripe', -0.3, 0.3, 0.44, 0.5, colors.white, { opacity: 0.9 }),
      ...kit.lightbar(roof),
    ]
  }
  if (role === 'ambulance') {
    const c = roof - m(0.9)
    return [
      kit.rect('cross-h', c - m(0.45), c + m(0.45), -0.08, 0.08, colors.siren),
      kit.rect('cross-v', c - m(0.14), c + m(0.14), -0.3, 0.3, colors.siren),
      ...kit.pair('stripe', -0.5, 0.5, 0.45, 0.5, colors.siren),
      ...kit.lightbar(Math.min(0.42, roof + m(1))),
    ]
  }
  if (role === 'fire') return [...ladder(kit, ctx), ...kit.lightbar(roof)]
  if (role === 'roadAssistance') {
    return [
      kit.rect('boom', -0.48, -0.05, -0.05, 0.05, colors.tire, { cornerRadius: 0.05 }),
      kit.circle('hook', -0.47, 0, 0.15, colors.tire),
      ...kit.lightbar(roof, colors.rescue, colors.rescue),
    ]
  }
  if (role === 'military') {
    return [
      kit.ellipse('camo-1', -0.3, 0.15, 0.9, 0.18 * W, colors.tire, { opacity: 0.35 }),
      kit.ellipse('camo-2', -0.05, -0.2, 0.7, 0.15 * W, colors.tire, { opacity: 0.35 }),
      kit.ellipse('camo-3', 0.15, 0.2, 0.6, 0.14 * W, colors.white, { opacity: 0.2 }),
    ]
  }
  return []
}

/**
 * 车辆的俯视轮廓（含角色标识）
 * @param kit - 绘图辅助函数
 * @param ctx - 绘制上下文
 * @param variant - 轮廓种类
 * @param role - 角色
 * @returns 图形；不是车辆轮廓时返回 undefined
 */
export const vehicleParts = (
  kit: ShapeKit,
  ctx: ShapeContext,
  variant: ShapeVariant,
  role?: string,
): ReactNode[] | undefined => {
  const parts = VEHICLE_PARTS[variant]
  return parts ? [...parts(kit, ctx), ...roleParts(kit, ctx, variant, role)] : undefined
}
