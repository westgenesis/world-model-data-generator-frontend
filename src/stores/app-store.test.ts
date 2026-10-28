import { beforeEach, describe, expect, it } from 'vitest'
import { ALL_PROJECTS_ID, useAppStore } from './app-store'

describe('useAppStore', () => {
  beforeEach(() => {
    useAppStore.setState({ sidebarCollapsed: false, currentProjectId: ALL_PROJECTS_ID })
  })

  it('切换侧栏收起状态', () => {
    useAppStore.getState().toggleSidebar()
    expect(useAppStore.getState().sidebarCollapsed).toBe(true)
  })

  it('设置当前项目', () => {
    useAppStore.getState().setCurrentProject('PRJ-1')
    expect(useAppStore.getState().currentProjectId).toBe('PRJ-1')
  })
})
