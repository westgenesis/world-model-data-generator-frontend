import 'i18next'
import type { LocaleResource } from '@/i18n/locales/zh-CN'

// 为 t() 提供键名类型提示与校验
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: { translation: LocaleResource }
  }
}
