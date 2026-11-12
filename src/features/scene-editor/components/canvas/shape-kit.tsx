import type { ReactNode } from 'react'
import { Circle, Ellipse, Line, Rect } from 'react-konva'
import type { CanvasColors } from './palette'

/** 归一化坐标 [u, v]：u 沿车长（-0.5 车尾 → 0.5 车头），v 沿车宽（-0.5 → 0.5） */
export type UV = [number, number]

/** 绘制目标物轮廓所需的上下文 */
export interface ShapeContext {
  /** 包围盒中心的 x（相对参考点） */
  cx: number
  /** 包围盒长、宽（米） */
  L: number
  W: number
  colors: CanvasColors
  /** 主体颜色 */
  body: string
  /** 一个屏幕像素对应的世界长度（米） */
  px: number
}

/**
 * 创建一组按包围盒归一化坐标绘图的辅助函数
 * @param ctx - 绘制上下文
 * @returns 绘图辅助函数
 */
export const createShapeKit = (ctx: ShapeContext) => {
  const { cx, L, W, colors, body } = ctx
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

  /** 归一化折线（描边） */
  const stroke = (key: string, pts: UV[], color: string, extra: object = {}) => (
    <Line
      key={key}
      points={pts.flatMap(([u, v]) => [cx + u * L, v * W])}
      stroke={color}
      strokeWidth={1}
      strokeScaleEnabled={false}
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

  /** 圆（圆心为归一化坐标，半径为米） */
  const circle = (
    key: string,
    u: number,
    v: number,
    r: number,
    fill: string,
    extra: object = {},
  ) => <Circle key={key} x={cx + u * L} y={v * W} radius={r} fill={fill} {...extra} />

  /** 椭圆（中心为归一化坐标，半径为米） */
  const ellipse = (
    key: string,
    u: number,
    v: number,
    rx: number,
    ry: number,
    fill: string,
    extra: object = {},
  ) => (
    <Ellipse key={key} x={cx + u * L} y={v * W} radiusX={rx} radiusY={ry} fill={fill} {...extra} />
  )

  /** 车身：前后圆角不同（Konva 圆角顺序为 左上、右上、右下、左下，x 正向为车头） */
  const hull = (key: string, u0: number, u1: number, rear: number, front: number, fill = body) => {
    const limit = Math.min(((u1 - u0) * L) / 2, W / 2)
    const r = Math.min(rear, limit)
    const f = Math.min(front, limit)
    return rect(key, u0, u1, -0.5, 0.5, fill, { cornerRadius: [r, f, f, r], ...outline })
  }

  /** 前灯与尾灯 */
  const lights = (u = 0.465): ReactNode[] => [
    ...pair('hl', u, 0.495, 0.24, 0.42, colors.headlight),
    ...pair('tl', -0.495, -0.47, 0.26, 0.44, colors.taillight),
  ]

  /** 后视镜 */
  const mirrors = (u: number): ReactNode[] =>
    [1, -1].map((side) =>
      ellipse(
        `mirror-${side}`,
        u,
        side * (0.5 + 0.06 / W),
        Math.min(0.035 * L, 0.16),
        Math.min(0.07 * W, 0.13),
        body,
        outline,
      ),
    )

  /** 车顶警灯条（中心 u，两色各占一半宽度） */
  const lightbar = (
    u: number,
    left: string = colors.siren,
    right: string = colors.sirenBlue,
  ): ReactNode[] => {
    const half = Math.min(0.15, 0.04 * L) / L
    return [
      rect('bar-l', u - half, u + half, 0, 0.36, left, { cornerRadius: 0.04 }),
      rect('bar-r', u - half, u + half, -0.36, 0, right, { cornerRadius: 0.04 }),
    ]
  }

  return { outline, rect, poly, stroke, pair, circle, ellipse, hull, lights, mirrors, lightbar }
}

/** 绘图辅助函数集合 */
export type ShapeKit = ReturnType<typeof createShapeKit>
