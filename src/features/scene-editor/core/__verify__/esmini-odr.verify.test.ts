/// <reference types="node" />
/**
 * 与 esmini 交叉验证 OpenDRIVE 解析、几何与无损导出。
 * 需要本地 esmini（https://github.com/esmini/esmini 的 demo 包），未设置 ESMINI_HOME 时跳过：
 *   ESMINI_HOME=/path/to/esmini-demo pnpm vitest run src/features/scene-editor/core/__verify__
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { evalReferenceLine, offsetPose } from '../opendrive/geometry'
import { laneSpansAt, sampleStations } from '../opendrive/lanes'
import { parseOpenDrive } from '../opendrive/parse'
import type { RoadNetwork } from '../opendrive/types'
import { parseXml, serializeXml } from '../xml'

const ESMINI_HOME = process.env.ESMINI_HOME
const XODR_DIR = ESMINI_HOME ? join(ESMINI_HOME, 'resources/xodr') : ''
const files = ESMINI_HOME
  ? readdirSync(XODR_DIR)
      .filter((f) => f.endsWith('.xodr'))
      .sort()
  : []
const work = ESMINI_HOME ? mkdtempSync(join(tmpdir(), 'odr-verify-')) : ''

/** esmini odrplot 输出的一条车道折线 */
interface PlotLane {
  key: string
  points: [number, number][]
}

/**
 * 调用 odrplot 导出车道采样点
 * @param xodr - xodr 文件路径
 * @returns CSV 文本
 */
const odrplot = (xodr: string): string => {
  const out = join(work, `${basename(xodr)}.${Date.now()}.csv`)
  execFileSync(join(ESMINI_HOME ?? '', 'bin/odrplot'), [xodr, out], { stdio: 'pipe' })
  return readFileSync(out, 'utf8')
}

/**
 * 解析 odrplot CSV：`lane, roadId, sectionIndex, laneId, type` 行开启一条折线，后续行为 x, y, z, h
 * @param csv - CSV 文本
 * @returns 车道折线
 */
const parsePlot = (csv: string): PlotLane[] => {
  const lanes: PlotLane[] = []
  for (const line of csv.split('\n')) {
    const cols = line.split(',').map((c) => c.trim())
    if (cols[0] === 'lane') lanes.push({ key: `${cols[1]}/${cols[2]}/${cols[3]}`, points: [] })
    else if (cols.length >= 2 && lanes.length) lanes.at(-1)?.points.push([+cols[0], +cols[1]])
  }
  return lanes
}

/**
 * 按 odrplot 的键生成我方密集折线（车道中心与外边界两种候选）
 * @param network - 路网
 * @param key - roadId/sectionIndex/laneId
 * @returns 中心线与外边界折线
 */
const ourLines = (network: RoadNetwork, key: string) => {
  const [roadId, si, li] = key.split('/')
  const road = network.roads.find((r) => r.id === roadId)
  const section = road?.laneSections[Number(si)]
  const center: [number, number][] = []
  const outer: [number, number][] = []
  if (!road || !section) return { center, outer }
  for (const s of sampleStations(road, section.s, section.sEnd, 0.05)) {
    const pose = evalReferenceLine(road, s)
    const span = laneSpansAt(road, section, s).get(Number(li))
    if (!pose || !span) continue
    const c = offsetPose(pose, (span.inner + span.outer) / 2)
    const o = offsetPose(pose, span.outer)
    center.push([c.x, c.y])
    outer.push([o.x, o.y])
  }
  return { center, outer }
}

/**
 * 点到线段 [i, i+1] 的距离
 * @param p - 点
 * @param line - 折线
 * @param i - 线段起点下标
 * @returns 距离
 */
const distToSegment = ([px, py]: [number, number], line: [number, number][], i: number): number => {
  const [ax, ay] = line[i]
  const [bx, by] = line[Math.min(i + 1, line.length - 1)]
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  const t = len2 > 0 ? Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0
  return Math.hypot(px - ax - t * dx, py - ay - t * dy)
}

/**
 * 一组有序点到折线的最大偏差。两者同向推进，先在上次命中位置附近搜索，偏差大时退回全量扫描
 * @param points - esmini 采样点（有序）
 * @param line - 我方折线
 * @returns 最大偏差
 */
const maxDeviation = (points: [number, number][], line: [number, number][]): number => {
  let worst = 0
  let hint = 0
  for (const p of points) {
    let best = Infinity
    let bestIdx = hint
    const scan = (from: number, to: number) => {
      for (let i = Math.max(0, from); i < Math.min(line.length, to); i++) {
        const d = distToSegment(p, line, i)
        if (d < best) {
          best = d
          bestIdx = i
        }
      }
    }
    scan(hint - 50, hint + 400)
    if (best > 0.01) scan(0, line.length)
    hint = bestIdx
    worst = Math.max(worst, best)
  }
  return worst
}

describe.skipIf(!ESMINI_HOME)('esmini 交叉验证：OpenDRIVE', { timeout: 120_000 }, () => {
  it.each(files)('%s：车道几何与 esmini 一致', (file) => {
    const path = join(XODR_DIR, file)
    const network = parseOpenDrive(parseXml(readFileSync(path, 'utf8')).doc)
    const plot = parsePlot(odrplot(path))

    let worst = 0
    let worstKey = ''
    let usesCenter = 0
    let usesOuter = 0
    for (const lane of plot) {
      const { center, outer } = ourLines(network, lane.key)
      expect(center.length, `我方缺少车道 ${lane.key}`).toBeGreaterThan(0)
      const devCenter = maxDeviation(lane.points, center)
      const devOuter = maxDeviation(lane.points, outer)
      const dev = Math.min(devCenter, devOuter)
      if (devCenter <= devOuter) usesCenter++
      else usesOuter++
      if (dev > worst) {
        worst = dev
        worstKey = lane.key
      }
    }
    console.info(
      `[odr] ${file.padEnd(36)} 车道 ${String(plot.length).padStart(4)}  最大偏差 ${worst.toFixed(4)} m (${worstKey || '-'})  匹配中心线 ${usesCenter} / 外边界 ${usesOuter}`,
    )
    expect(worst).toBeLessThan(0.05)
  })

  it.each(files)('%s：解析后原样导出，esmini 读取结果不变', (file) => {
    const path = join(XODR_DIR, file)
    const text = readFileSync(path, 'utf8')
    const exported = join(work, `roundtrip_${file}`)
    writeFileSync(exported, serializeXml(parseXml(text)))
    expect(parsePlot(odrplot(exported))).toEqual(parsePlot(odrplot(path)))
  })
})
