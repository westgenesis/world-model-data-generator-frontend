import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/** 主题模式：跟随系统 / 亮色 / 暗色 */
export type ThemeMode = 'system' | 'light' | 'dark'

interface AppState {
  /** 侧栏是否收起为图标栏 */
  sidebarCollapsed: boolean
  /** 当前选中的项目 ID；空字符串表示「全部项目」（不按项目筛选） */
  currentProjectId: string
  /** 主题模式 */
  themeMode: ThemeMode
  /** 切换侧栏收起状态 */
  toggleSidebar: () => void
  /** 设置当前项目 */
  setCurrentProject: (projectId: string) => void
  /** 设置主题模式 */
  setThemeMode: (mode: ThemeMode) => void
}

/** 应用级全局状态，持久化到 localStorage */
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      currentProjectId: '',
      themeMode: 'system',
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setCurrentProject: (projectId) => set({ currentProjectId: projectId }),
      setThemeMode: (mode) => set({ themeMode: mode }),
    }),
    {
      name: 'wmdg-app',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
