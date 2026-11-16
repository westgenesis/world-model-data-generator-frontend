import { useEffect, useRef } from 'react'

/** 粒子：世界坐标（x、y 归一化到 [-1, 1]，z 为深度） */
interface Particle {
  x: number
  y: number
  z: number
  /** 闪烁相位 */
  phase: number
}

/** 粒子数量 */
const PARTICLE_COUNT = 140
/** 地面网格纵向线条数（单侧） */
const GRID_COLUMNS = 14
/** 地面网格横向线条数 */
const GRID_ROWS = 18
/** 网格向前流动速度（每秒行距） */
const GRID_SPEED = 0.35
/** 品牌青色 RGB */
const CYAN = '34, 193, 245'

/**
 * 生成随机粒子
 * @returns 粒子
 */
const createParticle = (): Particle => ({
  x: Math.random() * 2 - 1,
  y: Math.random() * 2 - 1,
  z: Math.random(),
  phase: Math.random() * Math.PI * 2,
})

/**
 * 登录页动态背景：透视流动的地面网格（道路 / 世界）+ 漂浮的点云粒子，
 * 视角随鼠标轻微偏移。偏好减少动态效果时只绘制静态一帧。
 */
export const LoginBackdrop = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const particles = Array.from({ length: PARTICLE_COUNT }, createParticle)
    let width = 0
    let height = 0
    let frame = 0
    // 视角偏移：target 跟随鼠标，current 缓动逼近
    const view = { x: 0, y: 0, tx: 0, ty: 0 }

    /** 按容器尺寸与像素比调整画布 */
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    /**
     * 绘制地面透视网格
     * @param time - 动画时间（秒）
     */
    const drawGrid = (time: number) => {
      const horizon = height * 0.6 + view.y * 18
      const vx = width / 2 + view.x * 60
      const floor = height - horizon
      ctx.lineWidth = 1

      // 纵向线：从消失点放射
      for (let i = -GRID_COLUMNS; i <= GRID_COLUMNS; i++) {
        const spread = (i / GRID_COLUMNS) * width * 1.6
        const alpha = 0.22 * (1 - Math.abs(i) / (GRID_COLUMNS + 1))
        const gradient = ctx.createLinearGradient(0, horizon, 0, height)
        gradient.addColorStop(0, `rgba(${CYAN}, 0)`)
        gradient.addColorStop(1, `rgba(${CYAN}, ${alpha})`)
        ctx.strokeStyle = gradient
        ctx.beginPath()
        ctx.moveTo(vx, horizon)
        ctx.lineTo(width / 2 + spread, height)
        ctx.stroke()
      }

      // 横向线：深度按透视压缩，随时间朝观察者流动
      const offset = (time * GRID_SPEED) % 1
      for (let r = 0; r < GRID_ROWS; r++) {
        const depth = (r + offset) / GRID_ROWS
        const y = horizon + floor * depth ** 2.4
        ctx.strokeStyle = `rgba(${CYAN}, ${0.32 * depth ** 1.5})`
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }

      // 地平线光带
      const glow = ctx.createLinearGradient(0, horizon - 40, 0, horizon + 40)
      glow.addColorStop(0, `rgba(${CYAN}, 0)`)
      glow.addColorStop(0.5, `rgba(${CYAN}, 0.16)`)
      glow.addColorStop(1, `rgba(${CYAN}, 0)`)
      ctx.fillStyle = glow
      ctx.fillRect(0, horizon - 40, width, 80)
    }

    /**
     * 绘制点云粒子：越近越大越亮，缓慢向观察者漂移
     * @param time - 动画时间（秒）
     * @param dt - 距上一帧的时间（秒）
     */
    const drawParticles = (time: number, dt: number) => {
      const cx = width / 2 - view.x * 40
      const cy = height * 0.42 - view.y * 24
      for (const p of particles) {
        p.z -= dt * 0.04
        if (p.z <= 0.02) Object.assign(p, createParticle(), { z: 1 })
        const scale = 1 / (p.z * 2.2 + 0.25)
        const x = cx + p.x * width * 0.35 * scale
        const y = cy + p.y * height * 0.3 * scale
        if (x < -10 || x > width + 10 || y < -10 || y > height + 10) continue
        const twinkle = 0.6 + 0.4 * Math.sin(time * 2 + p.phase)
        const alpha = Math.min(1, (1 - p.z) * 0.9) * twinkle
        ctx.fillStyle = `rgba(${CYAN}, ${alpha})`
        ctx.beginPath()
        ctx.arc(x, y, Math.max(0.4, scale * 0.9), 0, Math.PI * 2)
        ctx.fill()
      }
    }

    let last = performance.now()
    /**
     * 渲染一帧
     * @param now - 当前时间戳（毫秒）
     */
    const render = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      view.x += (view.tx - view.x) * 0.04
      view.y += (view.ty - view.y) * 0.04
      ctx.clearRect(0, 0, width, height)
      drawGrid(now / 1000)
      drawParticles(now / 1000, dt)
      if (!reduceMotion) frame = requestAnimationFrame(render)
    }

    /**
     * 记录鼠标位置（归一化到 [-1, 1]）
     * @param e - 指针事件
     */
    const onPointerMove = (e: PointerEvent) => {
      view.tx = (e.clientX / window.innerWidth) * 2 - 1
      view.ty = (e.clientY / window.innerHeight) * 2 - 1
    }

    const observer = new ResizeObserver(() => {
      resize()
      if (reduceMotion) render(performance.now())
    })
    observer.observe(canvas)
    resize()
    frame = requestAnimationFrame(render)
    if (!reduceMotion) window.addEventListener('pointermove', onPointerMove)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('pointermove', onPointerMove)
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden className="absolute inset-0 size-full" />
}
