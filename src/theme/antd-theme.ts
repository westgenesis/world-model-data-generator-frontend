import type { ThemeConfig } from 'antd'

/** Ant Design 主题配置，与原型设计 token 保持一致 */
export const antdTheme: ThemeConfig = {
  cssVar: { prefix: 'ant' },
  hashed: false,
  token: {
    colorPrimary: '#009fe3',
    colorInfo: '#009fe3',
    colorSuccess: '#10b981',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    colorText: '#1f2937',
    colorTextSecondary: '#6b7280',
    colorTextTertiary: '#9ca3af',
    colorBorder: '#cbd5e1',
    colorBorderSecondary: '#e4e8ef',
    colorBgLayout: '#f5f7fa',
    colorBgContainer: '#ffffff',
    borderRadius: 6,
    borderRadiusLG: 10,
    fontSize: 13,
    fontFamily: `system-ui, -apple-system, 'Segoe UI', 'Microsoft YaHei', sans-serif`,
  },
  components: {
    Layout: {
      headerHeight: 56,
      headerBg: '#ffffff',
      siderBg: '#ffffff',
      bodyBg: '#f5f7fa',
    },
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: '#e6f7fd',
      itemSelectedColor: '#009fe3',
      itemHeight: 34,
      itemMarginInline: 0,
      groupTitleFontSize: 12,
    },
  },
}
