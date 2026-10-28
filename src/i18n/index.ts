import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import { enUS } from './locales/en-US'
import { zhCN } from './locales/zh-CN'

/** 支持的语言列表 */
export const SUPPORTED_LANGUAGES = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en-US', label: 'English' },
] as const

/** 支持的语言代码 */
export type Language = (typeof SUPPORTED_LANGUAGES)[number]['value']

export const resources = {
  'zh-CN': { translation: zhCN },
  'en-US': { translation: enUS },
} as const

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh-CN',
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.value),
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'wmdg-lang',
      caches: ['localStorage'],
    },
  })

export default i18n
