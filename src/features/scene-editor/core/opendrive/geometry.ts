import type { Geometry, Poly3, Road } from './types'

/** 参考线上一点的位姿 */
export interface Pose {
  x: number
  y: number
  /** 切线方向（弧度） */
  hdg: number
}

/** 5 点 Gauss-Legendre 积分节点与权重（区间 [-1, 1]） */
const GL_NODES = [
  [0, 0.5688888888888889],
  [-0.5384693101056831, 0.4786286704993665],
  [0.5384693101056831, 0.4786286704993665],
  [-0.906179845938664, 0.2369268850561891],
  [0.906179845938664, 0.2369268850561891],
] as const

/**
 * 数值积分：把 [0, b] 切成不超过 maxStep 的小段，每段用 5 点 Gauss-Legendre
 * @param f - 被积函数
 * @param b - 积分上限
 * @param maxStep - 小段最大长度
 * @returns 积分值
 */
const integrate = (f: (u: number) => number, b: number, maxStep = 2): number => {
  if (b <= 0) return 0
  const n = Math.max(1, Math.ceil(b / maxStep))
  const h = b / n
  let sum = 0
  for (let i = 0; i < n; i++) {
    const mid = (i + 0.5) * h
    for (const [x, w] of GL_NODES) sum += w * f(mid + (x * h) / 2)
  }
  return (sum * h) / 2
}

/**
 * 局部坐标 (u, v) 按起点位姿旋转平移到世界坐标
 * @param g - 几何段（提供起点与朝向）
 * @param u - 沿起点切线方向的距离
 * @param v - 垂直切线向左的距离
 * @param localHdg - 局部切线方向
 * @returns 世界坐标位姿
 */
const toWorld = (g: Geometry, u: number, v: number, localHdg: number): Pose => {
  const cos = Math.cos(g.hdg)
  const sin = Math.sin(g.hdg)
  return { x: g.x + u * cos - v * sin, y: g.y + u * sin + v * cos, hdg: g.hdg + localHdg }
}

/**
 * 计算缓和曲线（曲率随弧长线性变化）上的位姿
 * @param g - spiral 几何段
 * @param ds - 段内弧长
 * @returns 位姿
 */
const evalSpiral = (g: Extract<Geometry, { kind: 'spiral' }>, ds: number): Pose => {
  const rate = g.length > 0 ? (g.curvEnd - g.curvStart) / g.length : 0
  const theta = (u: number) => g.curvStart * u + (rate * u * u) / 2
  const u = integrate((t) => Math.cos(theta(t)), ds)
  const v = integrate((t) => Math.sin(theta(t)), ds)
  return toWorld(g, u, v, theta(ds))
}

/**
 * 计算 poly3（v 关于 u 的三次多项式，已弃用但仍可能出现）上的位姿；
 * 用牛顿迭代把弧长 ds 换算为局部 u
 * @param g - poly3 几何段
 * @param ds - 段内弧长
 * @returns 位姿
 */
const evalPoly3 = (g: Extract<Geometry, { kind: 'poly3' }>, ds: number): Pose => {
  const dv = (u: number) => g.b + 2 * g.c * u + 3 * g.d * u * u
  const speed = (u: number) => Math.hypot(1, dv(u))
  let u = ds
  for (let i = 0; i < 8; i++) {
    const err = integrate(speed, u, 1) - ds
    if (Math.abs(err) < 1e-9) break
    u -= err / speed(u)
  }
  const v = g.a + g.b * u + g.c * u * u + g.d * u * u * u
  return toWorld(g, u, v, Math.atan(dv(u)))
}

/**
 * 计算参数三次曲线上的位姿
 * @param g - paramPoly3 几何段
 * @param ds - 段内弧长
 * @returns 位姿
 */
const evalParamPoly3 = (g: Extract<Geometry, { kind: 'paramPoly3' }>, ds: number): Pose => {
  const p = g.pRange === 'normalized' ? (g.length > 0 ? ds / g.length : 0) : ds
  const u = g.aU + g.bU * p + g.cU * p * p + g.dU * p * p * p
  const v = g.aV + g.bV * p + g.cV * p * p + g.dV * p * p * p
  const du = g.bU + 2 * g.cU * p + 3 * g.dU * p * p
  const dv = g.bV + 2 * g.cV * p + 3 * g.dV * p * p
  return toWorld(g, u, v, Math.atan2(dv, du))
}

/**
 * 计算单个几何段内弧长 ds 处的位姿
 * @param g - 几何段
 * @param ds - 段内弧长（0 ≤ ds ≤ length）
 * @returns 位姿
 */
export const evalGeometry = (g: Geometry, ds: number): Pose => {
  switch (g.kind) {
    case 'line':
      return toWorld(g, ds, 0, 0)
    case 'arc': {
      const k = g.curvature
      if (Math.abs(k) < 1e-12) return toWorld(g, ds, 0, 0)
      return toWorld(g, Math.sin(k * ds) / k, (1 - Math.cos(k * ds)) / k, k * ds)
    }
    case 'spiral':
      return evalSpiral(g, ds)
    case 'poly3':
      return evalPoly3(g, ds)
    case 'paramPoly3':
      return evalParamPoly3(g, ds)
  }
}

/**
 * 在有序区间列表中找到包含 s 的最后一项（二分）
 * @param items - 按起点升序的列表
 * @param s - 查询位置
 * @param startOf - 取起点
 * @returns 下标，s 小于首项起点时返回 0
 */
export const findSegment = <T>(items: readonly T[], s: number, startOf: (item: T) => number) => {
  let lo = 0
  let hi = items.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (startOf(items[mid]) <= s) lo = mid
    else hi = mid - 1
  }
  return lo
}

/**
 * 计算道路参考线上 s 处的位姿
 * @param road - 道路
 * @param s - 参考线 s 坐标
 * @returns 位姿；道路没有几何段时返回 undefined
 */
export const evalReferenceLine = (road: Road, s: number): Pose | undefined => {
  if (!road.geometries.length) return undefined
  const g = road.geometries[findSegment(road.geometries, s, (x) => x.s)]
  return evalGeometry(g, Math.min(Math.max(s - g.s, 0), g.length))
}

/**
 * 计算分段三次多项式在 s 处的值
 * @param polys - 按 sOffset 升序的多项式列表
 * @param s - 查询位置（与 sOffset 同一参照）
 * @returns 多项式值；列表为空时返回 0
 */
export const evalPoly3List = (polys: readonly Poly3[], s: number): number => {
  if (!polys.length) return 0
  const p = polys[findSegment(polys, s, (x) => x.sOffset)]
  const ds = s - p.sOffset
  return p.a + p.b * ds + p.c * ds * ds + p.d * ds * ds * ds
}

/**
 * 参考线位姿沿法向偏移 t
 * @param pose - 参考线位姿
 * @param t - 横向偏移，左正右负
 * @returns 偏移后的点
 */
export const offsetPose = (pose: Pose, t: number): Pose => ({
  x: pose.x - t * Math.sin(pose.hdg),
  y: pose.y + t * Math.cos(pose.hdg),
  hdg: pose.hdg,
})
