import type { MenuProps } from 'antd'
import { Button, Dropdown, Tooltip } from 'antd'
import type { LucideIcon } from 'lucide-react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useIsDark } from '@/hooks/use-is-dark'
import type { ThemeMode } from '@/stores/app-store'
import { useAppStore } from '@/stores/app-store'

/** 各主题模式的图标 */
const MODE_ICONS: Record<ThemeMode, LucideIcon> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
}

/** 顶栏外观切换：跟随系统 / 亮色 / 暗色 */
export const ThemeToggle = () => {
  const { t } = useTranslation()
  const isDark = useIsDark()
  const themeMode = useAppStore((s) => s.themeMode)
  const setThemeMode = useAppStore((s) => s.setThemeMode)
  const CurrentIcon = isDark ? Moon : Sun

  const items: MenuProps['items'] = (Object.keys(MODE_ICONS) as ThemeMode[]).map((mode) => {
    const Icon = MODE_ICONS[mode]
    return {
      key: mode,
      icon: <Icon size={15} strokeWidth={1.75} />,
      label: t(`topbar.theme.${mode}`),
    }
  })

  return (
    <Dropdown
      trigger={['click']}
      menu={{
        items,
        selectable: true,
        selectedKeys: [themeMode],
        onClick: ({ key }) => setThemeMode(key as ThemeMode),
      }}
    >
      <Tooltip title={t('topbar.theme.label')}>
        <Button
          type="text"
          aria-label={t('topbar.theme.label')}
          icon={<CurrentIcon size={18} strokeWidth={1.75} />}
          className="text-fg-2!"
        />
      </Tooltip>
    </Dropdown>
  )
}
