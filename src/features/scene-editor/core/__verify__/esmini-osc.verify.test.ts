/// <reference types="node" />
/**
 * 与 esmini 交叉验证 OpenSCENARIO 解析与无损导出。
 * 需要本地 esmini（demo 包），未设置 ESMINI_HOME 时跳过：
 *   ESMINI_HOME=/path/to/esmini-demo pnpm vitest run src/features/scene-editor/core/__verify__
 *
 * 1. 初始位置：esmini 第 0 帧各实体的世界坐标 vs 我方解析结果
 * 2. 无损导出：原文件与「解析后原样导出」的文件分别交给 esmini 仿真，整段轨迹 CSV 必须一致
 *    （原文件连跑两次结果就不同的场景——含随机数或依赖外部仿真——不做比对）
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { parseOpenDrive } from '../opendrive/parse'
import { parseOpenScenario } from '../openscenario/parse'
import { resolveInitPoses } from '../openscenario/resolve'
import { parseXml, serializeXml } from '../xml'

const ESMINI_HOME = process.env.ESMINI_HOME
const XOSC_DIR = ESMINI_HOME ? join(ESMINI_HOME, 'resources/xosc') : ''
const files = ESMINI_HOME
  ? readdirSync(XOSC_DIR)
      .filter((f) => f.endsWith('.xosc') && !f.startsWith('__'))
      .sort()
  : []
const created: string[] = []

/** 已确认的、由 esmini 特有行为导致的初始位置差异（不计入断言） */
const KNOWN_DEVIATIONS: Record<string, string> = {
  'drop-bike.xosc': 'esmini 对 RelativeObjectPosition 的自行车额外做了 1.2 m 纵向对齐',
  'trailers.xosc': '挂车位置由牵引连接（TrailerAction）决定，验证范围外',
}

afterAll(() => created.forEach((f) => rmSync(f, { force: true })))

/** esmini 第 0 帧的实体状态 */
interface FrameEntity {
  name: string
  x: number
  y: number
  h: number
}

/**
 * 运行 esmini 并返回 CSV 日志；不会自行结束的场景在 30 秒后终止
 * @param xosc - 场景文件
 * @returns CSV 文本；esmini 无法加载时返回 undefined
 */
const runEsmini = (xosc: string, tag = ''): string | undefined => {
  const csv = `${xosc}${tag}.csv`
  created.push(csv)
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
      { cwd: dirname(xosc), stdio: 'pipe', timeout: 30_000 },
    )
  } catch {
    // 超时或退出码非 0：若已有日志仍可用于比对
  }
  return existsSync(csv) ? readFileSync(csv, 'utf8') : undefined
}

/**
 * 提取 CSV 中的数据行（去掉含文件名、版本号的表头）
 * @param csv - CSV 文本
 * @returns 数据行
 */
const dataRows = (csv: string) => csv.split('\n').filter((l) => /^\d+,/.test(l))

/**
 * 解析第 0 帧各实体位姿
 * @param csv - CSV 文本
 * @returns 实体状态列表
 */
const firstFrame = (csv: string): FrameEntity[] => {
  const lines = csv.split('\n')
  const header =
    lines
      .find((l) => l.startsWith('Index'))
      ?.split(',')
      .map((c) => c.trim()) ?? []
  const row =
    dataRows(csv)[0]
      ?.split(',')
      .map((c) => c.trim()) ?? []
  const result: FrameEntity[] = []
  header.forEach((col, i) => {
    const m = /^#(\d+) Entity_Name/.exec(col)
    if (!m) return
    const at = (name: string) => row[header.indexOf(`#${m[1]} ${name}`)]
    result.push({
      name: row[i],
      x: Number(at('World_Position_X [m]')),
      y: Number(at('World_Position_Y [m]')),
      h: Number(at('World_Heading_Angle [rad]')),
    })
  })
  return result
}

/**
 * 角度差归一化到 [-π, π]
 * @param a - 角度
 * @param b - 角度
 * @returns 差值
 */
const angleDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b))

describe.skipIf(!ESMINI_HOME)('esmini 交叉验证：OpenSCENARIO', { timeout: 120_000 }, () => {
  it.each(files)('%s', (file) => {
    const path = join(XOSC_DIR, file)
    const text = readFileSync(path, 'utf8')
    const source = parseXml(text)
    const scenario = parseOpenScenario(source.doc)

    const original = runEsmini(path)
    if (!original || !dataRows(original).length) {
      console.info(`[osc] ${file.padEnd(42)} esmini 无法独立运行（依赖外部控制器等），跳过`)
      return
    }

    // 1. 初始位置
    const xodrPath = scenario.logicFile ? resolve(XOSC_DIR, scenario.logicFile) : undefined
    const network =
      xodrPath && existsSync(xodrPath)
        ? parseOpenDrive(parseXml(readFileSync(xodrPath, 'utf8')).doc)
        : undefined
    const poses = resolveInitPoses(scenario, network)
    const frame = firstFrame(original)
    let worst = 0
    let headingWorst = 0
    const missing: string[] = []
    for (const e of frame) {
      const ours = poses.get(e.name)
      if (!ours) {
        missing.push(e.name)
        continue
      }
      worst = Math.max(worst, Math.hypot(ours.x - e.x, ours.y - e.y))
      headingWorst = Math.max(headingWorst, Math.abs(angleDiff(ours.hdg, e.h)))
    }

    // 2. 无损导出：esmini 的个别场景结果与文件名有关，因此与「同名长度的原文副本」比较
    const deterministic =
      dataRows(runEsmini(path, '.again') ?? '').join('\n') === dataRows(original).join('\n')
    const control = join(XOSC_DIR, `__cp_${file}`)
    const exported = join(XOSC_DIR, `__rt_${file}`)
    created.push(control, exported)
    writeFileSync(control, text)
    writeFileSync(exported, serializeXml(source))
    const rows = dataRows(runEsmini(control) ?? '').join('\n')
    const roundTrip = runEsmini(exported)
    const same = !!roundTrip && dataRows(roundTrip).join('\n') === rows

    console.info(
      `[osc] ${file.padEnd(42)} 实体 ${String(frame.length).padStart(2)}  位置偏差 ${worst.toFixed(4)} m  朝向偏差 ${headingWorst.toFixed(4)} rad  未解析 ${missing.join('/') || '-'}  导出回放一致 ${deterministic ? (same ? '是' : '否') : '（esmini 自身不确定，跳过）'}`,
    )
    if (deterministic) expect(same).toBe(true)
    if (!KNOWN_DEVIATIONS[file]) expect(worst).toBeLessThan(0.05)
  })
})
