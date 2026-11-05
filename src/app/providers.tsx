import { StyleProvider } from '@ant-design/cssinjs'
import { QueryClientProvider } from '@tanstack/react-query'
import { App as AntdApp, ConfigProvider } from 'antd'
import antdZhCN from 'antd/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import type { ReactNode } from 'react'
import { useEffect, useMemo } from 'react'
import { useIsDark } from '@/hooks/use-is-dark'
import { queryClient } from '@/lib/query-client'
import { createAntdTheme } from '@/theme/antd-theme'

dayjs.locale('zh-cn')

/**
 * 全局 Provider：数据请求、antd 主题与中文语言包、亮/暗模式、样式层级
 * @param props.children - 子节点
 */
export const AppProviders = ({ children }: { children: ReactNode }) => {
  const isDark = useIsDark()
  const antdTheme = useMemo(() => createAntdTheme(isDark), [isDark])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  return (
    <QueryClientProvider client={queryClient}>
      {/* layer: 将 antd 样式放入 @layer antd，使 Tailwind 工具类可覆盖 */}
      <StyleProvider layer>
        <ConfigProvider theme={antdTheme} locale={antdZhCN}>
          <AntdApp>{children}</AntdApp>
        </ConfigProvider>
      </StyleProvider>
    </QueryClientProvider>
  )
}
