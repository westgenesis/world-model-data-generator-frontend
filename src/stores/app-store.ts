import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/** 「全部项目」汇总视图的特殊项目 ID */
export const ALL_PROJECTS_ID = '__all__'

interface AppState {
  /** 侧栏是否收起 */
  sidebarCollapsed: boolean
  /** 当前选中的项目 ID */
  currentProjectId: string
  /** 切换侧栏收起状态 */
  toggleSidebar: () => void
  /** 设置当前项目 */
  setCurrentProject: (projectId: string) => void
}

/** 应用级全局状态，持久化到 localStorage */
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      currentProjectId: ALL_PROJECTS_ID,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setCurrentProject: (projectId) => set({ currentProjectId: projectId }),
    }),
    {
      name: 'wmdg-app',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
