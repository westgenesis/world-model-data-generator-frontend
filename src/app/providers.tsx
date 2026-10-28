import { StyleProvider } from '@ant-design/cssinjs'
import { QueryClientProvider } from '@tanstack/react-query'
import { App as AntdApp, ConfigProvider } from 'antd'
import antdEnUS from 'antd/locale/en_US'
import antdZhCN from 'antd/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { queryClient } from '@/lib/query-client'
import { antdTheme } from '@/theme/antd-theme'

/** 各语言对应的 antd 与 dayjs 语言配置 */
const LOCALE_MAP = {
  'zh-CN': { antd: antdZhCN, dayjs: 'zh-cn' },
  'en-US': { antd: antdEnUS, dayjs: 'en' },
} as const

/**
 * 全局 Provider：数据请求、antd 主题与语言、样式层级
 * @param props.children - 子节点
 */
export const AppProviders = ({ children }: { children: ReactNode }) => {
  const { i18n } = useTranslation()
  const locale = LOCALE_MAP[i18n.resolvedLanguage as keyof typeof LOCALE_MAP] ?? LOCALE_MAP['zh-CN']

  useEffect(() => {
    dayjs.locale(locale.dayjs)
    document.documentElement.lang = i18n.resolvedLanguage ?? 'zh-CN'
  }, [locale, i18n.resolvedLanguage])

  return (
    <QueryClientProvider client={queryClient}>
      {/* layer: 将 antd 样式放入 @layer antd，使 Tailwind 工具类可覆盖 */}
      <StyleProvider layer>
        <ConfigProvider theme={antdTheme} locale={locale.antd}>
          <AntdApp>{children}</AntdApp>
        </ConfigProvider>
      </StyleProvider>
    </QueryClientProvider>
  )
}
