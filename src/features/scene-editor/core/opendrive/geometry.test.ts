import { describe, expect, it } from 'vitest'
import { evalGeometry, evalPoly3List } from './geometry'
import type { Geometry } from './types'

const base = { s: 0, x: 10, y: 20, hdg: Math.PI / 2 }

describe('evalGeometry', () => {
  it('直线沿起点朝向前进', () => {
    const p = evalGeometry({ ...base, kind: 'line', length: 100 }, 30)
    expect(p.x).toBeCloseTo(10)
    expect(p.y).toBeCloseTo(50)
    expect(p.hdg).toBeCloseTo(Math.PI / 2)
  })

  it('圆弧走完整圆回到起点，半圆到达直径对端', () => {
    const r = 50
    const arc: Geometry = { ...base, kind: 'arc', curvature: 1 / r, length: 2 * Math.PI * r }
    const end = evalGeometry(arc, arc.length)
    expect(end.x).toBeCloseTo(10)
    expect(end.y).toBeCloseTo(20)
    // 朝北起步、左转半圈：圆心在 (10 - r, 20)，对端在 (10 - 2r, 20)
    const half = evalGeometry(arc, Math.PI * r)
    expect(half.x).toBeCloseTo(10 - 2 * r)
    expect(half.y).toBeCloseTo(20)
    expect(half.hdg).toBeCloseTo(Math.PI / 2 + Math.PI)
  })

  it('缓和曲线：朝向等于曲率积分，曲率为常数时与圆弧一致', () => {
    const spiral: Geometry = { ...base, kind: 'spiral', curvStart: 0, curvEnd: 0.02, length: 80 }
    // θ = (k0 + k1) / 2 · L
    expect(evalGeometry(spiral, 80).hdg).toBeCloseTo(Math.PI / 2 + 0.8, 10)

    const asArc: Geometry = { ...base, kind: 'spiral', curvStart: 0.01, curvEnd: 0.01, length: 60 }
    const arc: Geometry = { ...base, kind: 'arc', curvature: 0.01, length: 60 }
    const a = evalGeometry(asArc, 60)
    const b = evalGeometry(arc, 60)
    expect(a.x).toBeCloseTo(b.x, 8)
    expect(a.y).toBeCloseTo(b.y, 8)
  })

  it('缓和曲线终点与 Fresnel 积分参考值一致', () => {
    // 曲率 0 → 1/A²·L 的标准回旋线，A = 100，L = 100：
    // x = ∫cos(u²/2A²)du，y = ∫sin(u²/2A²)du，参考值由 Simpson 法（20 万段）独立算出
    const g: Geometry = {
      s: 0,
      x: 0,
      y: 0,
      hdg: 0,
      kind: 'spiral',
      curvStart: 0,
      curvEnd: 0.01,
      length: 100,
    }
    const p = evalGeometry(g, 100)
    expect(p.x).toBeCloseTo(97.5288, 3)
    expect(p.y).toBeCloseTo(16.3714, 3)
  })

  it('paramPoly3 支持 arcLength 与 normalized 两种参数范围', () => {
    const shape = { aU: 0, bU: 1, cU: 0, dU: 0, aV: 0, bV: 0, cV: 0.01, dV: 0 }
    const arcLen: Geometry = {
      ...base,
      hdg: 0,
      kind: 'paramPoly3',
      length: 10,
      pRange: 'arcLength',
      ...shape,
    }
    const p = evalGeometry(arcLen, 10)
    expect(p.x).toBeCloseTo(10 + 10)
    expect(p.y).toBeCloseTo(20 + 1)
    expect(p.hdg).toBeCloseTo(Math.atan2(0.2, 1))

    const norm: Geometry = {
      ...base,
      hdg: 0,
      kind: 'paramPoly3',
      length: 10,
      pRange: 'normalized',
      aU: 0,
      bU: 10,
      cU: 0,
      dU: 0,
      aV: 0,
      bV: 0,
      cV: 1,
      dV: 0,
    }
    const q = evalGeometry(norm, 10)
    expect(q.x).toBeCloseTo(20)
    expect(q.y).toBeCloseTo(21)
  })

  it('poly3 按弧长求值，直线退化情况与 line 一致', () => {
    const g: Geometry = { ...base, kind: 'poly3', length: 25, a: 0, b: 0, c: 0, d: 0 }
    const p = evalGeometry(g, 25)
    expect(p.x).toBeCloseTo(10)
    expect(p.y).toBeCloseTo(45)
  })
})

describe('evalPoly3List', () => {
  it('按 sOffset 选择分段并以段起点为原点求值', () => {
    const polys = [
      { sOffset: 0, a: 3, b: 0, c: 0, d: 0 },
      { sOffset: 10, a: 3, b: 0.1, c: 0, d: 0 },
    ]
    expect(evalPoly3List(polys, 5)).toBe(3)
    expect(evalPoly3List(polys, 20)).toBeCloseTo(4)
    expect(evalPoly3List([], 5)).toBe(0)
  })
})
