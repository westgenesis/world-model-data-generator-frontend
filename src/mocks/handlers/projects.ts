import { http, HttpResponse } from 'msw'
import type { Project } from '@/api/projects'

/** 项目 Mock 数据，取自原型 */
const projects: Project[] = [
  { id: 'PRJ-20260601-0001', name: '城市道路数据项目' },
  { id: 'PRJ-20260612-0002', name: '高速场景数据项目' },
  { id: 'PRJ-20260720-0003', name: '长尾与极端场景项目' },
]

export const projectHandlers = [http.get('*/api/projects', () => HttpResponse.json(projects))]
