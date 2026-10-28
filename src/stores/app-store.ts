import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/** 「全部项目」汇总视图的特殊项目 ID */
export const ALL_PROJECTS_ID = '__all__'

/** 主题模式：跟随系统 / 亮色 / 暗色 */
export type ThemeMode = 'system' | 'light' | 'dark'

interface AppState {
  /** 侧栏是否收起为图标栏 */
  sidebarCollapsed: boolean
  /** 当前选中的项目 ID */
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
      currentProjectId: ALL_PROJECTS_ID,
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
