/// <reference types="node" />
/**
 * 与 esmini 交叉验证编辑结果：用编辑函数生成 / 修改场景，交给 esmini 仿真，
 * 检查目标物在各时刻的位置与关键帧插值一致，且原有实体不受影响。
 * 未设置 ESMINI_HOME 时跳过：
 *   ESMINI_HOME=/path/to/esmini-demo pnpm vitest run src/features/scene-editor/core/__verify__
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { addEntity, createEmptyScenario, setKeyframes } from '../openscenario/edit'
import type { Keyframe } from '../openscenario/edit'
import { laneToWorld } from '../opendrive/lanes'
import { parseOpenDrive } from '../opendrive/parse'
import { poseAt } from '../openscenario/motion'
import { withHeadings } from '../openscenario/edit'
import { parseXml, serializeXml } from '../xml'

const ESMINI_HOME = process.env.ESMINI_HOME
const XOSC_DIR = ESMINI_HOME ? join(ESMINI_HOME, 'resources/xosc') : ''
const created: string[] = []
afterAll(() => created.forEach((f) => rmSync(f, { force: true })))

/** esmini 日志中一个实体在一帧的状态 */
interface Row {
  t: number
  name: string
  x: number
  y: number
}

/**
 * 写入场景并用 esmini 仿真
 * @param name - 文件名（写在 resources/xosc 下，以便相对路径生效）
 * @param text - 场景内容
 * @returns 各帧各实体状态
 */
const simulate = (name: string, text: string): Row[] => {
  const xosc = join(XOSC_DIR, name)
  const csv = `${xosc}.csv`
  created.push(xosc, csv)
  writeFileSync(xosc, text)
  try {
    execFileSync(
      join(ESMINI_HOME ?? '', 'bin/esmini'),
      [
        '--headless',
        '--osc',
        xosc,
        '--fixed_timestep',
        '0.05',
        '--csv_logger',
        csv,
        '--disable_stdout',
      ],
      { cwd: dirname(xosc), stdio: 'pipe', timeout: 60_000 },
    )
  } catch {
    // 退出码非 0 时仍尝试读取日志
  }
  if (!existsSync(csv)) return []
  const lines = readFileSync(csv, 'utf8').split('\n')
  const header =
    lines
      .find((l) => l.startsWith('Index'))
      ?.split(',')
      .map((c) => c.trim()) ?? []
  const rows: Row[] = []
  for (const line of lines.filter((l) => /^\d+,/.test(l))) {
    const cols = line.split(',').map((c) => c.trim())
    header.forEach((col, i) => {
      const m = /^#(\d+) Entity_Name/.exec(col)
      if (!m) return
      const at = (n: string) => Number(cols[header.indexOf(`#${m[1]} ${n}`)])
      rows.push({
        t: Number(cols[1]),
        name: cols[i],
        x: at('World_Position_X [m]'),
        y: at('World_Position_Y [m]'),
      })
    })
  }
  return rows
}

/**
 * 检查实体在各时刻与关键帧插值的偏差
 * @param rows - 仿真结果
 * @param name - 实体名
 * @param keys - 关键帧
 * @returns 最大偏差（米）与参与比较的帧数
 */
const deviation = (rows: Row[], name: string, keys: Keyframe[]) => {
  const k = withHeadings(keys)
  const own = rows.filter((r) => r.name === name && r.t <= k[k.length - 1].t)
  const worst = Math.max(
    ...own.map((r) => {
      const p = poseAt(k, r.t)
      return p ? Math.hypot(p.x - r.x, p.y - r.y) : Infinity
    }),
  )
  return { worst, frames: own.length }
}

describe.skipIf(!ESMINI_HOME)('esmini 交叉验证：编辑结果', { timeout: 120_000 }, () => {
  it('新建场景：车辆、行人按关键帧运动，静态障碍物不动', () => {
    const car: Keyframe[] = [
      { t: 0, x: 20, y: -1.75 },
      { t: 4, x: 60, y: -1.75 },
      { t: 7, x: 90, y: 1.75 },
      { t: 10, x: 120, y: 1.75 },
    ]
    const ped: Keyframe[] = [
      { t: 0, x: 80, y: -8 },
      { t: 6, x: 80, y: 0 },
      { t: 9, x: 84, y: 3 },
    ]
    let doc = createEmptyScenario({ logicFile: '../xodr/straight_500m.xodr', stopTime: 11 }).doc
    doc = addEntity(
      doc,
      { name: 'Car1', kind: 'vehicle', category: 'car', length: 4.6, width: 1.8, height: 1.5 },
      { kind: 'world', x: 20, y: -1.75, h: 0 },
    )
    doc = addEntity(
      doc,
      {
        name: 'Ped1',
        kind: 'pedestrian',
        category: 'pedestrian',
        length: 0.5,
        width: 0.5,
        height: 1.7,
      },
      { kind: 'world', x: 80, y: -8, h: 0 },
    )
    doc = addEntity(
      doc,
      { name: 'Cone1', kind: 'misc', category: 'obstacle', length: 0.4, width: 0.4, height: 0.7 },
      { kind: 'lane', roadId: '1', laneId: -1, s: 150, offset: 0 },
    )
    doc = setKeyframes(doc, 'Car1', car)
    doc = setKeyframes(doc, 'Ped1', ped)

    const rows = simulate(
      '__edit_new.xosc',
      serializeXml({ doc, declaration: '<?xml version="1.0" encoding="UTF-8"?>' }),
    )
    expect(rows.length, 'esmini 未能运行生成的场景').toBeGreaterThan(0)

    const c = deviation(rows, 'Car1', car)
    const p = deviation(rows, 'Ped1', ped)
    // 锥桶：期望位置由几何核心按车道坐标计算，且全程不动
    const network = parseOpenDrive(
      parseXml(readFileSync(join(XOSC_DIR, '../xodr/straight_500m.xodr'), 'utf8')).doc,
    )
    const expected = laneToWorld(network.roads[0], -1, 150)
    const cone = rows.filter((r) => r.name === 'Cone1')
    const coneMove = Math.max(
      ...cone.map((r) => Math.hypot(r.x - (expected?.x ?? NaN), r.y - (expected?.y ?? NaN))),
    )
    console.info(
      `[edit] 新建场景  Car1 ${c.frames} 帧最大偏差 ${c.worst.toFixed(4)} m；Ped1 ${p.frames} 帧最大偏差 ${p.worst.toFixed(4)} m；Cone1 位移 ${coneMove.toFixed(4)} m`,
    )
    expect(c.worst).toBeLessThan(0.05)
    expect(p.worst).toBeLessThan(0.05)
    expect(coneMove).toBeLessThan(0.05)
  })

  it('1.2 场景（中文实体名）：角色车辆、火车按关键帧运动，人行横道、路灯等静态物体不动', () => {
    const police: Keyframe[] = [
      { t: 0, x: 30, y: -1.75 },
      { t: 5, x: 90, y: -1.75 },
      { t: 8, x: 120, y: 1.75 },
    ]
    const ambulance: Keyframe[] = [
      { t: 0, x: 200, y: 1.75 },
      { t: 6, x: 140, y: 1.75 },
    ]
    const train: Keyframe[] = [
      { t: 0, x: 300, y: -1.75 },
      { t: 8, x: 420, y: -1.75 },
    ]
    let doc = createEmptyScenario({ logicFile: '../xodr/straight_500m.xodr', stopTime: 9 }).doc
    const vehicle = { kind: 'vehicle' as const, height: 1.6 }
    doc = addEntity(
      doc,
      { ...vehicle, name: '警车1', category: 'car', role: 'police', length: 4.8, width: 1.85 },
      { kind: 'world', x: 30, y: -1.75, h: 0 },
    )
    doc = addEntity(
      doc,
      { ...vehicle, name: '救护车1', category: 'van', role: 'ambulance', length: 5.6, width: 2 },
      { kind: 'world', x: 200, y: 1.75, h: Math.PI },
    )
    doc = addEntity(
      doc,
      { ...vehicle, name: '火车1', category: 'train', length: 50, width: 3, maxSpeed: 44.4 },
      { kind: 'world', x: 300, y: -1.75, h: 0 },
    )
    const statics = [
      { name: '人行横道1', category: 'crosswalk', x: 100, y: 0, size: [3, 8, 0.01] },
      { name: '路灯1', category: 'streetLamp', x: 80, y: 6, size: [0.3, 0.3, 8] },
      { name: '龙门架1', category: 'gantry', x: 160, y: 0, size: [1, 12, 6] },
    ]
    for (const o of statics) {
      const [length, width, height] = o.size
      doc = addEntity(
        doc,
        { name: o.name, kind: 'misc', category: o.category, length, width, height },
        { kind: 'world', x: o.x, y: o.y, h: 0 },
      )
    }
    doc = setKeyframes(doc, '警车1', police)
    doc = setKeyframes(doc, '救护车1', ambulance)
    doc = setKeyframes(doc, '火车1', train)

    const text = serializeXml({ doc, declaration: '<?xml version="1.0" encoding="UTF-8"?>' })
    expect(text).toContain('revMinor="2"')
    expect(text).toContain('role="police"')
    const rows = simulate('__edit_roles.xosc', text)
    expect(rows.length, 'esmini 未能运行生成的 1.2 场景').toBeGreaterThan(0)

    const results = [
      deviation(rows, '警车1', police),
      deviation(rows, '救护车1', ambulance),
      deviation(rows, '火车1', train),
    ]
    const staticMove = Math.max(
      ...statics.map((o) =>
        Math.max(
          ...rows.filter((r) => r.name === o.name).map((r) => Math.hypot(r.x - o.x, r.y - o.y)),
        ),
      ),
    )
    console.info(
      `[edit] 1.2 场景  ${['警车1', '救护车1', '火车1']
        .map((n, i) => `${n} ${results[i].frames} 帧最大偏差 ${results[i].worst.toFixed(4)} m`)
        .join('；')}；静态物体最大位移 ${staticMove.toFixed(4)} m`,
    )
    results.forEach((r) => expect(r.worst).toBeLessThan(0.05))
    expect(staticMove).toBeLessThan(0.05)
  })

  it('导入场景：新增目标物按关键帧运动，原有实体轨迹不变', () => {
    const file = 'lane_change_simple.xosc'
    const original = readFileSync(join(XOSC_DIR, file), 'utf8')
    const source = parseXml(original)
    const keys: Keyframe[] = [
      { t: 0, x: 10, y: 5 },
      { t: 5, x: 40, y: 12 },
      { t: 9, x: 60, y: 30 },
    ]
    let doc = addEntity(
      source.doc,
      { name: 'Added', kind: 'vehicle', category: 'car', length: 4.6, width: 1.8, height: 1.5 },
      { kind: 'world', x: 10, y: 5, h: 0 },
    )
    doc = setKeyframes(doc, 'Added', keys)

    const before = simulate(`__edit_orig_${file}`, original)
    const after = simulate(
      `__edit_mod_${file}`,
      serializeXml({ doc, declaration: source.declaration }),
    )
    expect(after.length).toBeGreaterThan(0)

    const ego = (rows: Row[]) =>
      rows.filter((r) => r.name === 'Ego').map((r) => `${r.t},${r.x},${r.y}`)
    const d = deviation(after, 'Added', keys)
    console.info(
      `[edit] 导入场景  Added ${d.frames} 帧最大偏差 ${d.worst.toFixed(4)} m；Ego 轨迹${ego(before).join() === ego(after).join() ? '不变' : '发生变化'}`,
    )
    expect(d.worst).toBeLessThan(0.05)
    expect(ego(after)).toEqual(ego(before))
  })
})
