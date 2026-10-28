import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppProviders } from '@/app/providers'
import { router } from '@/app/router'
import { env } from '@/lib/env'
import '@/i18n'
import '@/styles/index.css'

/** 按需启动 MSW 接口 Mock（仅开发环境） */
const enableMocking = async (): Promise<void> => {
  if (!import.meta.env.DEV || !env.VITE_ENABLE_MOCK) return
  const { worker } = await import('@/mocks/browser')
  await worker.start({ onUnhandledFrame: 'bypass' })
}

void enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </StrictMode>,
  )
})
