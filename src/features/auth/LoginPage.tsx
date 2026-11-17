import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { App, Button, ConfigProvider, Form, Input } from 'antd'
import type { ThemeConfig } from 'antd'
import {
  ArrowRight,
  BadgeCheck,
  Clapperboard,
  LockKeyhole,
  ShieldCheck,
  UserRound,
  Workflow,
} from 'lucide-react'
import { useId, useMemo, useRef, useState } from 'react'
import type { LoginInput } from '@/api/auth'
import { currentUserQueryOptions, login, loginSchema } from '@/api/auth'
import { AppLogo } from '@/components/AppLogo'
import { zodRule } from '@/lib/form'
import { getErrorMessage } from '@/lib/http'
import { useAuthStore } from '@/stores/auth-store'
import { createAntdTheme } from '@/theme/antd-theme'
import { LoginArtwork } from './components/LoginArtwork'

const routeApi = getRouteApi('/login')

/** 登录成功后卡片退场动画时长（毫秒） */
const EXIT_DURATION = 450

/** 右侧介绍的系统核心能力 */
const FEATURES = [
  {
    icon: Clapperboard,
    title: '场景准备',
    desc: '：可视化编辑场景资源，沉淀可复用的世界模型场景。',
  },
  {
    icon: Workflow,
    title: '生产编排',
    desc: '：组合任务模板与流程方案，批量调度数据生成任务。',
  },
  {
    icon: BadgeCheck,
    title: '质检归档',
    desc: '：自动校验数据质量并分类归档，形成数据闭环。',
  },
] as const

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

/** 登录页：蓝色品牌背景 + 左右分栏卡片，左侧登录表单，右侧系统介绍 */
export const LoginPage = () => {
  const { redirect } = routeApi.useSearch()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const setTokens = useAuthStore((s) => s.setTokens)
  const [form] = Form.useForm<LoginInput>()
  const [leaving, setLeaving] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const rawId = useId()
  /** 曲线裁切 id：去掉 useId 中的特殊字符，保证可作为 CSS url() 片段 */
  const curveId = `login-curve-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`
  const loginTheme = useMemo<ThemeConfig>(() => {
    const base = createAntdTheme(false)
    return {
      ...base,
      token: {
        ...base.token,
        borderRadius: 10,
        controlHeightLG: 46,
        fontSizeLG: 15,
        colorPrimary: '#0a7fd6',
        colorPrimaryHover: '#0a9ee0',
        colorPrimaryActive: '#0067c7',
      },
      components: {
        ...base.components,
        Form: {
          labelColor: '#475569',
          labelFontSize: 13,
          itemMarginBottom: 20,
          verticalLabelPadding: '0 0 6px',
          verticalLabelMargin: 0,
        },
      },
    }
  }, [])
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
    <ConfigProvider theme={loginTheme}>
      <div className="relative isolate flex min-h-dvh items-center justify-center overflow-clip bg-[#06418f] px-4 py-8 text-slate-900 sm:px-6 lg:py-12">
        {/* 背景渐变与光晕 */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,#0a4fae_0%,#06418f_45%,#033372_100%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -left-32 h-[52rem] w-[52rem] rounded-full bg-[radial-gradient(circle,rgb(34_193_245/0.28),transparent_62%)] blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -bottom-56 h-[46rem] w-[46rem] rounded-full bg-[radial-gradient(circle,rgb(0_103_199/0.5),transparent_65%)] blur-2xl"
        />

        {/* 斜切几何块 */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 -left-24 h-full w-[46%] bg-white/[0.04] [clip-path:polygon(0_0,100%_0,58%_100%,0_100%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 right-0 h-full w-[34%] bg-white/[0.03] [clip-path:polygon(46%_0,100%_0,100%_100%,0_100%)]"
        />

        {/* 点阵纹理 */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,rgb(255_255_255/0.08)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)] [background-size:28px_28px]"
        />

        {/* 巨型水印 */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 -right-24 -translate-y-1/2 rotate-[-14deg] text-[18vw] leading-none font-black tracking-[0.08em] whitespace-nowrap text-white/[0.045] select-none"
        >
          WORLD MODEL
        </div>

        {/* 右侧蓝色面板的曲线裁切 */}
        <svg aria-hidden width="0" height="0" className="absolute">
          <defs>
            <clipPath id={curveId} clipPathUnits="objectBoundingBox">
              <path d="M0.16 0C0.05 0.18 0 0.34 0.05 0.5C0.1 0.66 0.24 0.72 0.2 0.84C0.17 0.93 0.08 0.97 0.05 1H1V0H0.16Z" />
            </clipPath>
          </defs>
        </svg>

        {/* 登录卡片 */}
        <main className="relative w-full max-w-[1060px]">
          <div
            ref={cardRef}
            className={`transition-all duration-[450ms] ease-out motion-reduce:transition-none ${
              leaving ? 'scale-[0.97] opacity-0 blur-sm' : ''
            }`}
          >
            <div className="animate-fade-up overflow-hidden rounded-[26px] bg-white shadow-[0_40px_100px_-32px_rgb(0_22_60/0.65)] ring-1 ring-white/30 motion-reduce:animate-none">
              <div className="grid lg:min-h-[620px] lg:grid-cols-[1.06fr_1fr]">
                {/* 左侧：品牌与登录表单 */}
                <section className="flex flex-col px-7 py-9 sm:px-12 sm:py-11 lg:px-14 lg:py-12">
                  <div className="group flex items-center gap-3">
                    <AppLogo size={40} />
                    <div className="text-[15px] font-semibold text-slate-900">
                      世界模型数据生成系统
                    </div>
                  </div>

                  <div className="mt-10 lg:mt-12">
                    <p className="text-sm text-slate-500">欢迎使用</p>
                    <h1 className="mt-2 text-[28px] leading-tight font-semibold tracking-tight text-slate-900 sm:text-[32px]">
                      世界模型数据生成系统
                    </h1>
                    <p className="mt-3 text-sm text-slate-500">请使用管理员分配的账号登录</p>
                  </div>

                  <Form
                    form={form}
                    layout="vertical"
                    requiredMark={false}
                    disabled={mutation.isPending || leaving}
                    className="mt-9"
                    onFinish={(values) => mutation.mutate(loginSchema.parse(values))}
                  >
                    <Form.Item name="username" label="账号" rules={[zodRule(shape.username)]}>
                      <Input
                        size="large"
                        autoFocus
                        autoComplete="username"
                        placeholder="请输入账号"
                        prefix={<UserRound size={16} className="text-slate-400" />}
                      />
                    </Form.Item>
                    <Form.Item name="password" label="密码" rules={[zodRule(shape.password)]}>
                      <Input.Password
                        size="large"
                        autoComplete="current-password"
                        placeholder="请输入密码"
                        prefix={<LockKeyhole size={16} className="text-slate-400" />}
                      />
                    </Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      size="large"
                      block
                      loading={mutation.isPending}
                      className="group mt-2 border-0! bg-linear-to-r! from-[#22a9ef]! to-[#0067c7]! font-medium! shadow-[0_12px_24px_-10px_rgb(0_103_199/0.55)]! transition-[filter,box-shadow] hover:shadow-[0_16px_30px_-12px_rgb(0_103_199/0.65)]! hover:brightness-105"
                    >
                      登录
                      <ArrowRight
                        size={16}
                        className="transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
                      />
                    </Button>
                  </Form>

                  <footer className="mt-auto flex flex-wrap items-center justify-center gap-x-2 pt-10 text-center text-xs text-slate-400">
                    <ShieldCheck size={14} className="hidden shrink-0 sm:block" />
                    <span>
                      仅限授权用户访问 · © {new Date().getFullYear()} 世界模型数据生成系统
                    </span>
                  </footer>
                </section>

                {/* 右侧：系统介绍与场景插画 */}
                <aside className="relative hidden overflow-hidden lg:block">
                  <div
                    className="absolute inset-0 bg-[radial-gradient(ellipse_at_78%_16%,#2bb8f2_0%,#0a7fd2_45%,#0459a8_100%)]"
                    style={{ clipPath: `url(#${curveId})` }}
                  >
                    {/* 网格 */}
                    <div
                      aria-hidden
                      className="absolute inset-0 [background-image:linear-gradient(to_right,rgb(255_255_255/0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.07)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_65%_25%,black,transparent_72%)] [background-size:32px_32px] opacity-60"
                    />
                    {/* 品牌水印 */}
                    <AppLogo
                      size={300}
                      className="absolute -top-16 -right-16 rotate-12 opacity-[0.09]"
                    />
                  </div>

                  {/* 插画：与蓝色面板共用裁切，避免越过曲线进入白色区域 */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{ clipPath: `url(#${curveId})` }}
                  >
                    <LoginArtwork className="absolute inset-x-0 bottom-0 w-full" />
                  </div>

                  <div className="relative flex h-full flex-col py-12 pr-10 pl-24">
                    <div>
                      <p className="text-[11px] font-medium tracking-[0.24em] text-white/55">
                        系统概览
                      </p>
                      <h2 className="mt-3 text-[26px] leading-snug font-semibold text-white">
                        从场景构建到数据产出
                      </h2>
                      <p className="mt-4 text-[13px] leading-7 text-white/75">
                        面向自动驾驶场景的一站式数据生成平台，覆盖场景资源、生产编排、质量检验与数据集管理，帮助团队高效产出可信、可复用的合成数据。
                      </p>

                      <h3 className="mt-7 text-sm font-semibold tracking-wide text-white/90">
                        核心能力
                      </h3>
                      <ul className="mt-4 space-y-3.5">
                        {FEATURES.map(({ icon: Icon, title, desc }) => (
                          <li key={title} className="flex items-start gap-3">
                            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                              <Icon size={14} className="text-white/85" />
                            </span>
                            <p className="text-[13px] leading-6 text-white/70">
                              <span className="font-medium text-white/95">{title}</span>
                              {desc}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ConfigProvider>
  )
}
