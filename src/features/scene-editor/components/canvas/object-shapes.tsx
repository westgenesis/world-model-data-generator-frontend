import type { ReactNode } from 'react'
import type { ShapeVariant } from './entity-variant'
import type { ShapeContext, ShapeKit } from './shape-kit'

type Parts = (kit: ShapeKit, ctx: ShapeContext) => ReactNode[]

/**
 * 沿长度方向重复的元素数量
 * @param length - 总长（米）
 * @param step - 间距（米）
 * @param min - 最少数量
 * @returns 数量
 */
const repeat = (length: number, step: number, min = 2) => Math.max(min, Math.round(length / step))

/** 行人与静态物体的俯视轮廓 */
const OBJECT_PARTS: Partial<Record<ShapeVariant, Parts>> = {
  pedestrian: (k, { L, W, body, colors }) => [
    k.ellipse('arms', -0.02, 0, 0.18 * L, 0.5 * W, body, { opacity: 0.55 }),
    k.ellipse('torso', -0.04, 0, 0.24 * L, 0.4 * W, body, k.outline),
    k.circle('head', 0.06, 0, 0.22 * Math.min(L, W), body, k.outline),
    k.poly(
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
  wheelchair: (k, { L, W, body, colors }) => [
    ...k.pair('wheel', -0.3, 0.2, 0.38, 0.5, colors.tire, { cornerRadius: W * 0.04 }),
    k.rect('seat', -0.32, 0.22, -0.36, 0.36, body, { cornerRadius: W * 0.06, ...k.outline }),
    ...k.pair('foot', 0.22, 0.46, 0.12, 0.26, colors.tire),
    k.circle('head', -0.08, 0, 0.18 * Math.min(L, W), body, k.outline),
  ],
  animal: (k, { L, W, body }) => [
    k.ellipse('body', -0.08, 0, 0.34 * L, 0.4 * W, body, k.outline),
    k.circle('head', 0.36, 0, 0.28 * Math.min(L, W), body, k.outline),
    ...k.pair('ear', 0.4, 0.46, 0.18, 0.32, body),
    k.rect('tail', -0.5, -0.4, -0.05, 0.05, body),
  ],
  cone: (k, { L, W, colors }) => {
    const min = Math.min(L, W)
    return [
      k.rect('base', -0.5, 0.5, -0.5, 0.5, colors.cone, {
        cornerRadius: min * 0.15,
        opacity: 0.85,
        ...k.outline,
      }),
      k.circle('ring', 0, 0, 0.34 * min, colors.white),
      k.circle('top', 0, 0, 0.2 * min, colors.cone),
    ]
  },
  box: (k, { L, W, body, colors }) => {
    const cross = {
      closed: false,
      stroke: colors.white,
      strokeWidth: 1,
      strokeScaleEnabled: false,
      opacity: 0.6,
    }
    return [
      k.rect('box', -0.5, 0.5, -0.5, 0.5, body, {
        cornerRadius: Math.min(L, W) * 0.08,
        ...k.outline,
      }),
      k.stroke(
        'x1',
        [
          [-0.42, -0.42],
          [0.42, 0.42],
        ],
        colors.white,
        cross,
      ),
      k.stroke(
        'x2',
        [
          [-0.42, 0.42],
          [0.42, -0.42],
        ],
        colors.white,
        cross,
      ),
    ]
  },
  barrier: (k, { L, colors }) => {
    const n = repeat(L, 0.5)
    return [
      ...Array.from({ length: n }, (_, i) =>
        k.rect(
          `seg-${i}`,
          -0.5 + i / n,
          -0.5 + (i + 1) / n,
          -0.5,
          0.5,
          i % 2 ? colors.white : colors.taillight,
        ),
      ),
      k.rect('frame', -0.5, 0.5, -0.5, 0.5, 'transparent', k.outline),
    ]
  },
  railing: (k, { L, W, body, colors }) => {
    const n = repeat(L, 1)
    const post = Math.max(W * 0.9, 0.08)
    return [
      k.rect('rail', -0.5, 0.5, -0.3, 0.3, body, k.outline),
      ...Array.from({ length: n + 1 }, (_, i) =>
        k.circle(`post-${i}`, -0.5 + i / n, 0, post, colors.white),
      ),
    ]
  },
  wall: (k, { L, body, colors }) => {
    const n = repeat(L, 1)
    return [
      k.rect('wall', -0.5, 0.5, -0.5, 0.5, body, k.outline),
      ...Array.from({ length: n - 1 }, (_, i) =>
        k.rect(
          `joint-${i}`,
          -0.5 + (i + 1) / n - 0.02 / L,
          -0.5 + (i + 1) / n + 0.02 / L,
          -0.5,
          0.5,
          colors.white,
          {
            opacity: 0.35,
          },
        ),
      ),
    ]
  },
  pole: (k, { L, W, body, colors }) => {
    const min = Math.min(L, W)
    return [
      k.circle('pole', 0, 0, min / 2, body, k.outline),
      k.circle('top', 0, 0, min / 4, colors.white, { opacity: 0.6 }),
    ]
  },
  lamp: (k, { L, W, body, colors }) => {
    const min = Math.min(L, W)
    // 灯臂朝前方伸出 1.5 m，灯头带光晕
    return [
      k.ellipse('glow', 0.5 + 1.5 / L, 0, 1.2, 1.2, colors.headlight, { opacity: 0.18 }),
      k.rect('arm', 0, 0.5 + 1.5 / L, -0.04 / W, 0.04 / W, body),
      k.ellipse('head', 0.5 + 1.5 / L, 0, 0.35, 0.18, colors.headlight, k.outline),
      k.circle('pole', 0, 0, min / 2, body, k.outline),
      k.circle('top', 0, 0, min / 4, colors.white, { opacity: 0.6 }),
    ]
  },
  gantry: (k, { W, body, colors }) => {
    const post = Math.min(0.5, W * 0.06) / W
    return [
      k.rect('beam', -0.2, 0.2, -0.5, 0.5, body, k.outline),
      k.rect('post-l', -0.5, 0.5, 0.5 - post, 0.5, body, k.outline),
      k.rect('post-r', -0.5, 0.5, -0.5, -0.5 + post, body, k.outline),
      k.rect('sign-1', -0.12, 0.12, 0.08, 0.4, colors.sign, k.outline),
      k.rect('sign-2', -0.12, 0.12, -0.4, -0.08, colors.sign, k.outline),
    ]
  },
  building: (k, { L, W, body, colors }) => {
    const n = repeat(L, 3)
    return [
      k.rect('base', -0.5, 0.5, -0.5, 0.5, body, { opacity: 0.85, ...k.outline }),
      k.rect('roof', -0.45, 0.45, -0.45, 0.45, colors.white, {
        opacity: 0.15,
        cornerRadius: Math.min(L, W) * 0.02,
      }),
      ...Array.from({ length: n - 1 }, (_, i) =>
        k.stroke(
          `grid-${i}`,
          [
            [-0.45 + ((i + 1) * 0.9) / n, -0.45],
            [-0.45 + ((i + 1) * 0.9) / n, 0.45],
          ],
          colors.white,
          { opacity: 0.3 },
        ),
      ),
      k.stroke(
        'ridge',
        [
          [-0.45, 0],
          [0.45, 0],
        ],
        colors.white,
        { opacity: 0.45 },
      ),
    ]
  },
  tree: (k, { L, W, colors }) => {
    const min = Math.min(L, W)
    return [
      k.circle('crown', 0, 0, min / 2, colors.tree, { opacity: 0.8, ...k.outline }),
      k.circle('inner', -0.08 * (min / L), 0.08 * (min / W), min / 4, colors.white, {
        opacity: 0.18,
      }),
    ]
  },
  bush: (k, { L, W, colors }) => {
    const r = Math.min(L, W) * 0.3
    const blobs: [number, number][] = [
      [-0.2, -0.15],
      [0.18, -0.18],
      [0.2, 0.18],
      [-0.18, 0.2],
      [0, 0],
    ]
    return blobs.map(([u, v], i) =>
      k.circle(`blob-${i}`, u, v, r, colors.tree, { opacity: 0.85, ...k.outline }),
    )
  },
  crosswalk: (k, { W, colors }) => {
    // 斑马线：条纹平行于行车方向，宽 0.45 m、间距 0.45 m，横跨宽度方向
    const n = repeat(W, 0.9, 1)
    const stripe = 0.45 / W
    return Array.from({ length: n }, (_, i) => {
      const v = -0.5 + (i + 0.5) / n
      return k.rect(`stripe-${i}`, -0.5, 0.5, v - stripe / 2, v + stripe / 2, colors.marking)
    })
  },
  roadMark: (k, { colors }) => [
    k.poly(
      'arrow',
      [
        [-0.5, -0.12],
        [0.15, -0.12],
        [0.15, -0.5],
        [0.5, 0],
        [0.15, 0.5],
        [0.15, 0.12],
        [-0.5, 0.12],
      ],
      colors.marking,
    ),
  ],
  patch: (k, { L, W, body, px }) => [
    k.rect('area', -0.5, 0.5, -0.5, 0.5, body, {
      opacity: 0.3,
      cornerRadius: Math.min(L, W) * 0.3,
      stroke: body,
      strokeWidth: 1.5,
      strokeScaleEnabled: false,
      dash: [6 * px, 4 * px],
    }),
  ],
  parking: (k, { colors }) => [
    k.rect('space', -0.5, 0.5, -0.5, 0.5, colors.sirenBlue, {
      opacity: 0.12,
    }),
    k.stroke(
      'lines',
      [
        [0.5, -0.5],
        [-0.5, -0.5],
        [-0.5, 0.5],
        [0.5, 0.5],
      ],
      colors.marking,
      { strokeWidth: 2 },
    ),
  ],
  island: (k, { L, W, colors, px }) => [
    k.rect('island', -0.5, 0.5, -0.5, 0.5, colors.island, {
      cornerRadius: Math.min(L, W) / 2,
      stroke: colors.white,
      strokeWidth: 1.5,
      strokeScaleEnabled: false,
    }),
    k.rect('inner', -0.42, 0.42, -0.3, 0.3, 'transparent', {
      cornerRadius: (Math.min(L, W) / 2) * 0.6,
      stroke: colors.yellow,
      strokeWidth: 1,
      strokeScaleEnabled: false,
      dash: [6 * px, 4 * px],
      opacity: 0.8,
    }),
  ],
}

/**
 * 行人与静态物体的俯视轮廓
 * @param kit - 绘图辅助函数
 * @param ctx - 绘制上下文
 * @param variant - 轮廓种类
 * @returns 图形；不是此类轮廓时返回 undefined
 */
export const objectParts = (
  kit: ShapeKit,
  ctx: ShapeContext,
  variant: ShapeVariant,
): ReactNode[] | undefined => OBJECT_PARTS[variant]?.(kit, ctx)
