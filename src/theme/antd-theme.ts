import type { ThemeConfig } from 'antd'
import { theme } from 'antd'

/** 品牌主色 */
const BRAND = { light: '#0a9ee0', dark: '#2bb3f0' } as const

/**
 * 生成 antd 主题配置，色值与 src/styles/index.css 中的 token 保持一致
 * @param isDark - 是否暗色模式
 * @returns antd ThemeConfig
 */
export const createAntdTheme = (isDark: boolean): ThemeConfig => ({
  algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
  cssVar: { prefix: 'ant' },
  hashed: false,
  token: {
    colorPrimary: isDark ? BRAND.dark : BRAND.light,
    colorInfo: isDark ? BRAND.dark : BRAND.light,
    colorSuccess: isDark ? '#32d583' : '#12b76a',
    colorWarning: isDark ? '#fdb022' : '#f79009',
    colorError: isDark ? '#f97066' : '#f04438',
    colorTextBase: isDark ? '#e6eaf0' : '#111827',
    colorBgLayout: isDark ? '#0b0f17' : '#f4f6f9',
    colorBgContainer: isDark ? '#121823' : '#ffffff',
    colorBgElevated: isDark ? '#171e2b' : '#ffffff',
    colorBorder: isDark ? '#2f3949' : '#d3d9e2',
    colorBorderSecondary: isDark ? '#222a37' : '#e6e9ef',
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,
    fontSize: 14,
    controlHeight: 34,
    fontFamily: `'Inter', system-ui, -apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif`,
    boxShadowSecondary: isDark
      ? '0 12px 32px -8px rgb(0 0 0 / 0.6)'
      : '0 12px 32px -8px rgb(16 24 40 / 0.18)',
  },
  components: {
    Menu: {
      itemBg: 'transparent',
      subMenuItemBg: 'transparent',
      itemHeight: 38,
      itemBorderRadius: 8,
      itemMarginInline: 8,
      itemMarginBlock: 2,
      iconSize: 18,
      collapsedIconSize: 18,
      iconMarginInlineEnd: 12,
      itemSelectedBg: isDark ? 'rgb(43 179 240 / 0.14)' : '#e8f6fd',
      itemSelectedColor: isDark ? BRAND.dark : BRAND.light,
      itemHoverBg: isDark ? 'rgb(255 255 255 / 0.05)' : '#f1f4f8',
      itemColor: isDark ? '#a3adbd' : '#4b5563',
      groupTitleColor: isDark ? '#6b7587' : '#8b95a5',
    },
    Breadcrumb: {
      fontSize: 13,
    },
    Card: {
      paddingLG: 20,
    },
  },
})
