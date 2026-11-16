import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { App, Button, ConfigProvider, Form, Input } from 'antd'
import { ArrowRight, LockKeyhole, UserRound } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import type { LoginInput } from '@/api/auth'
import { currentUserQueryOptions, login, loginSchema } from '@/api/auth'
import { AppLogo } from '@/components/AppLogo'
import { zodRule } from '@/lib/form'
import { getErrorMessage } from '@/lib/http'
import { useAuthStore } from '@/stores/auth-store'
import { createAntdTheme } from '@/theme/antd-theme'
import { LoginBackdrop } from './components/LoginBackdrop'

const routeApi = getRouteApi('/login')

/** 登录成功后卡片退场动画时长（毫秒） */
const EXIT_DURATION = 450

/** 品牌亮点，展示在左侧；delay 为依次入场的动画延迟类名 */
const HIGHLIGHTS = [
  { label: '场景编辑与仿真', delay: '[animation-delay:360ms]' },
  { label: '数据生成编排', delay: '[animation-delay:460ms]' },
  { label: '质量评估闭环', delay: '[animation-delay:560ms]' },
]

/**
 * 校验回跳地址为站内路径，防止开放重定向
 * @param redirect - 查询参数中的回跳地址
 * @returns 安全的站内地址
 */
const safeRedirect = (redirect?: string): string =>
  redirect?.startsWith('/') && !redirect.startsWith('//') ? redirect : '/'

/**
 * 判断用户是否偏好减少动态效果
 * @returns 是否减少动效
 */
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** 登录页：动态网格背景 + 流光边框登录卡片，固定使用暗色视觉 */
export const LoginPage = () => {
  const { redirect } = routeApi.useSearch()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const setTokens = useAuthStore((s) => s.setTokens)
  const [form] = Form.useForm<LoginInput>()
  const [leaving, setLeaving] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const darkTheme = useMemo(() => createAntdTheme(true), [])
  const shape = loginSchema.shape

  /** 登录失败时卡片左右抖动 */
  const shake = () => {
    if (prefersReducedMotion()) return
    cardRef.current?.animate(
      [0, -10, 9, -6, 4, 0].map((x) => ({ transform: `translateX(${x}px)` })),
      { duration: 420, easing: 'ease-out' },
    )
  }

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: async (tokens) => {
      setTokens({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
      })
      queryClient.removeQueries({ queryKey: currentUserQueryOptions.queryKey })
      if (tokens.must_change_password) message.warning('当前为初始密码，请尽快修改')
      setLeaving(true)
      if (!prefersReducedMotion()) await new Promise((r) => setTimeout(r, EXIT_DURATION))
      await navigate({ href: safeRedirect(redirect), replace: true })
    },
    onError: (error) => {
      message.error(getErrorMessage(error, '登录失败，请稍后重试'))
      form.setFieldValue('password', '')
      shake()
    },
  })

  return (
    <ConfigProvider theme={darkTheme}>
      <div className="dark relative isolate flex min-h-dvh overflow-clip bg-[#05080f] text-fg">
        {/* 背景光晕 */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-1/4 -left-1/4 size-[70vmax] animate-aurora rounded-full bg-[radial-gradient(circle,rgb(34_193_245/0.18),transparent_60%)] blur-3xl motion-reduce:animate-none"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-1/4 -bottom-1/3 size-[60vmax] animate-aurora rounded-full bg-[radial-gradient(circle,rgb(122_90_248/0.16),transparent_60%)] blur-3xl [animation-delay:-8s] motion-reduce:animate-none"
        />
        <LoginBackdrop />

        <main className="relative mx-auto flex w-full max-w-6xl flex-col items-center justify-center gap-10 px-4 py-12 lg:flex-row lg:justify-between lg:px-12">
          {/* 品牌区 */}
          <section className="max-w-lg text-center lg:text-left">
            <div className="flex animate-rise items-center justify-center gap-3 motion-reduce:animate-none lg:justify-start">
              <AppLogo size={40} />
              <span className="text-sm tracking-[0.2em] text-fg-2 uppercase">World Model</span>
            </div>
            <h1 className="mt-6 animate-rise bg-linear-to-r from-white via-[#9fe3ff] to-[#22c1f5] bg-clip-text text-3xl leading-tight font-semibold text-transparent [animation-delay:120ms] motion-reduce:animate-none sm:text-4xl lg:text-5xl">
              世界模型
              <br />
              数据生成系统
            </h1>
            <p className="mt-4 hidden animate-rise text-base text-fg-2 [animation-delay:240ms] motion-reduce:animate-none sm:block">
              从场景构建到数据产出，一站式驱动世界模型训练数据生产。
            </p>
            <ul className="mt-8 hidden flex-wrap gap-2 lg:flex">
              {HIGHLIGHTS.map(({ label, delay }) => (
                <li
                  key={label}
                  className={`animate-rise rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-fg-2 backdrop-blur motion-reduce:animate-none ${delay}`}
                >
                  {label}
                </li>
              ))}
            </ul>
          </section>

          {/* 登录卡片：外层旋转的锥形渐变形成流光边框 */}
          <div
            ref={cardRef}
            className={`w-full max-w-sm transition-all duration-450 ease-in motion-reduce:transition-none ${
              leaving ? 'scale-95 opacity-0 blur-sm' : ''
            }`}
          >
            <div className="relative animate-rise rounded-2xl p-px [animation-delay:200ms] motion-reduce:animate-none">
              <div
                aria-hidden
                className="absolute inset-0 animate-border-spin rounded-2xl bg-[conic-gradient(from_var(--wm-angle),rgb(255_255_255/0.08)_0_60%,#22c1f5_78%,#9b8afb_88%,rgb(255_255_255/0.08)_100%)] motion-reduce:animate-none"
              />
              <div className="relative rounded-[15px] bg-[#0a0f1a]/85 px-7 py-8 shadow-[0_24px_80px_-20px_rgb(34_193_245/0.35)] backdrop-blur-xl">
                <h2 className="text-xl font-semibold">欢迎登录</h2>
                <p className="mt-1 mb-7 text-[13px] text-fg-3">请使用管理员分配的账号登录</p>

                <Form
                  form={form}
                  layout="vertical"
                  requiredMark={false}
                  disabled={mutation.isPending || leaving}
                  onFinish={(values) => mutation.mutate(loginSchema.parse(values))}
                >
                  <Form.Item name="username" label="账号" rules={[zodRule(shape.username)]}>
                    <Input
                      size="large"
                      autoFocus
                      autoComplete="username"
                      placeholder="请输入账号"
                      prefix={<UserRound size={16} className="text-fg-3" />}
                    />
                  </Form.Item>
                  <Form.Item name="password" label="密码" rules={[zodRule(shape.password)]}>
                    <Input.Password
                      size="large"
                      autoComplete="current-password"
                      placeholder="请输入密码"
                      prefix={<LockKeyhole size={16} className="text-fg-3" />}
                    />
                  </Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    block
                    loading={mutation.isPending}
                    className="group mt-2 border-0! bg-linear-to-r! from-[#22c1f5]! to-[#0a7fd6]! shadow-[0_8px_24px_-6px_rgb(34_193_245/0.6)]! transition-shadow hover:shadow-[0_10px_32px_-4px_rgb(34_193_245/0.8)]!"
                  >
                    登录
                    <ArrowRight
                      size={16}
                      className="transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
                    />
                  </Button>
                </Form>
              </div>
            </div>
          </div>
        </main>

        <footer className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-xs text-fg-3">
          © {new Date().getFullYear()} World Model Data Generator
        </footer>
      </div>
    </ConfigProvider>
  )
}
