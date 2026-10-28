#!/usr/bin/env node
/**
 * Docker 部署脚本：选择环境后使用对应的 deploy/env/<环境>.env 执行 docker compose
 *
 * 用法：
 *   pnpm docker:build                      交互选择环境 → 构建镜像 → 询问是否启动
 *   pnpm docker:build --env prod --up      非交互（CI 可用）：构建 prod 并启动
 *   pnpm docker:build --env prod --no-up   只构建不启动
 *   pnpm docker:down [--env dev]           停止并移除某环境的容器
 *   pnpm docker:logs [--env dev]           跟踪某环境的日志
 */
import { spawn } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { parseArgs } from 'node:util'
import { fileURLToPath } from 'node:url'
import { confirm, select } from '@inquirer/prompts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const ENV_DIR = join(ROOT, 'deploy/env')
const COMPOSE_FILE = join(ROOT, 'deploy/docker-compose.yml')

/**
 * 生成终端着色函数
 * @param {number} code - ANSI 颜色码
 * @returns {(text: string) => string} 着色函数
 */
const paint = (code) => (text) => `\x1b[${code}m${text}\x1b[0m`

/** 终端着色 */
const color = { cyan: paint(36), green: paint(32), red: paint(31), dim: paint(2), bold: paint(1) }

/**
 * 环境排序权重：dev → staging → prod → 其他
 * @param {string} name - 环境名
 * @returns {number} 排序权重
 */
const envOrder = (name) => {
  const i = ['dev', 'staging', 'prod'].indexOf(name)
  return i === -1 ? 99 : i
}

/**
 * 解析 env 文件为键值对，并读取首行 `# @label xxx` 作为环境显示名
 * @param {string} file - env 文件路径
 * @returns {{ label?: string, vars: Record<string, string> }} 解析结果
 */
const parseEnvFile = (file) => {
  const vars = {}
  let label
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    const labelMatch = line.match(/^#\s*@label\s+(.+)$/)
    if (labelMatch) label = labelMatch[1].trim()
    if (!line || line.startsWith('#')) continue
    const i = line.indexOf('=')
    if (i > 0)
      vars[line.slice(0, i).trim()] = line
        .slice(i + 1)
        .trim()
        .replace(/^(['"])(.*)\1$/, '$2')
  }
  return { label, vars }
}

/**
 * 扫描 deploy/env 下的环境配置（忽略 *.local.env 覆盖文件）
 * @returns {Array<{ name: string, label: string, files: string[], vars: Record<string, string> }>} 环境列表
 */
const loadEnvironments = () =>
  readdirSync(ENV_DIR)
    .filter((f) => f.endsWith('.env') && !f.endsWith('.local.env'))
    .map((f) => {
      const name = f.slice(0, -'.env'.length)
      const base = join(ENV_DIR, f)
      const local = join(ENV_DIR, `${name}.local.env`)
      const files = existsSync(local) ? [base, local] : [base]
      const parsed = files.map(parseEnvFile)
      return {
        name,
        label: parsed[0].label ?? name,
        files,
        // 本机覆盖文件中的值优先
        vars: Object.assign({}, ...parsed.map((p) => p.vars)),
      }
    })
    .sort((a, b) => envOrder(a.name) - envOrder(b.name))

/**
 * 以继承终端输出的方式执行 docker compose
 * @param {{ files: string[] }} env - 目标环境
 * @param {string[]} args - compose 子命令及参数
 * @returns {Promise<void>} 命令成功时 resolve
 */
const compose = (env, args) =>
  new Promise((resolve, reject) => {
    const fullArgs = [
      'compose',
      '-f',
      COMPOSE_FILE,
      ...env.files.flatMap((f) => ['--env-file', f]),
      ...args,
    ]
    console.log(color.dim(`$ docker ${fullArgs.map((a) => relative(ROOT, a) || a).join(' ')}`))
    const child = spawn('docker', fullArgs, { cwd: ROOT, stdio: 'inherit' })
    child.on('error', reject)
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`docker compose 退出码 ${code}`)),
    )
  })

/**
 * 确定目标环境：优先使用 --env 参数，否则交互选择
 * @param {ReturnType<typeof loadEnvironments>} envs - 可选环境
 * @param {string | undefined} name - 命令行指定的环境名
 * @returns {Promise<ReturnType<typeof loadEnvironments>[number]>} 选中的环境
 */
const pickEnvironment = async (envs, name) => {
  if (name) {
    const env = envs.find((e) => e.name === name)
    if (!env) throw new Error(`未找到环境 "${name}"，可选：${envs.map((e) => e.name).join(', ')}`)
    return env
  }
  return select({
    message: '选择部署环境',
    choices: envs.map((env) => ({
      name: `${env.label} ${color.dim(`(${env.name})`)}`,
      value: env,
      description: `后端 ${env.vars.API_UPSTREAM ?? '-'} · 端口 ${env.vars.WEB_PORT ?? '-'}`,
    })),
  })
}

/**
 * 打印环境配置摘要
 * @param {ReturnType<typeof loadEnvironments>[number]} env - 目标环境
 */
const printSummary = (env) => {
  const { IMAGE_NAME, IMAGE_TAG, WEB_PORT, API_UPSTREAM, COMPOSE_PROJECT_NAME } = env.vars
  console.log()
  console.log(color.bold(`  ${env.label} (${env.name})`))
  console.log(`  镜像      ${color.cyan(`${IMAGE_NAME}:${IMAGE_TAG}`)}`)
  console.log(`  后端地址  ${color.cyan(API_UPSTREAM)}`)
  console.log(`  对外端口  ${color.cyan(WEB_PORT)}`)
  console.log(`  项目名    ${color.cyan(COMPOSE_PROJECT_NAME)}`)
  console.log(`  配置文件  ${env.files.map((f) => relative(ROOT, f)).join(' + ')}`)
  console.log()
}

/**
 * 构建流程：构建镜像，并按参数或交互决定是否启动
 * @param {ReturnType<typeof loadEnvironments>[number]} env - 目标环境
 * @param {boolean | undefined} up - 命令行指定是否启动；undefined 时询问
 */
const runBuild = async (env, up) => {
  printSummary(env)
  await compose(env, ['build'])
  console.log(color.green(`\n✔ 镜像构建完成：${env.vars.IMAGE_NAME}:${env.vars.IMAGE_TAG}\n`))

  const shouldUp =
    up ?? (await confirm({ message: `是否立即启动「${env.label}」？`, default: true }))
  if (!shouldUp) return

  await compose(env, ['up', '-d'])
  console.log(color.green(`\n✔ 已启动：http://localhost:${env.vars.WEB_PORT}`))
  console.log(color.dim(`  查看日志：pnpm docker:logs --env ${env.name}`))
  console.log(color.dim(`  停止服务：pnpm docker:down --env ${env.name}\n`))
}

/**
 * 入口：解析命令行参数并分发子命令
 */
const main = async () => {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      env: { type: 'string', short: 'e' },
      up: { type: 'boolean' },
      'no-up': { type: 'boolean' },
    },
  })
  const command = positionals[0] ?? 'build'
  const envs = loadEnvironments()
  if (envs.length === 0) throw new Error(`${relative(ROOT, ENV_DIR)} 下没有环境配置文件`)

  const env = await pickEnvironment(envs, values.env)
  if (command === 'build') {
    await runBuild(env, values['no-up'] ? false : values.up)
  } else if (command === 'down') {
    await compose(env, ['down'])
  } else if (command === 'logs') {
    await compose(env, ['logs', '-f'])
  } else {
    throw new Error(`未知命令 "${command}"，可选：build / down / logs`)
  }
}

main().catch((error) => {
  // Ctrl+C 退出交互时不视为错误
  if (error?.name === 'ExitPromptError') process.exit(130)
  console.error(color.red(`\n✖ ${error.message}`))
  process.exit(1)
})
