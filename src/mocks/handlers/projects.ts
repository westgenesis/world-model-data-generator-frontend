import { http, HttpResponse } from 'msw'
import type {
  ProjectDetail,
  ProjectFormInput,
  ProjectMemberAddInput,
  ProjectMemberSetting,
} from '@/api/projects'
import {
  buildProjectOverview,
  buildProjectResources,
  getProjectMembers,
  projects,
  users,
} from '../db/user-service'
import { matchKeyword, mockLatency, paginate } from '../utils'

/** 路由参数：项目 ID */
type IdParams = { id: string }

/**
 * 根据 ID 查找项目
 * @param id - 项目 ID
 */
const findProject = (id: string) => projects.find((p) => p.id === id)

/** 项目不存在时的响应 */
const notFound = () => HttpResponse.json({ message: '项目不存在' }, { status: 404 })

/**
 * 设为默认项目时，取消其他项目的默认标记（默认项目全局唯一）
 * @param id - 新的默认项目 ID
 */
const ensureSingleDefault = (id: string) =>
  projects.forEach((p) => {
    if (p.id !== id) p.isDefault = false
  })

/**
 * 同步项目成员数
 * @param project - 项目
 */
const syncMemberCount = (project: ProjectDetail) => {
  if (!project.isDefault) project.memberCount = getProjectMembers(project).length
}

export const projectHandlers = [
  // 顶栏项目切换器：仅返回进行中的项目
  http.get('*/api/projects', () =>
    HttpResponse.json(
      projects.filter((p) => p.status === 'active').map(({ id, name }) => ({ id, name })),
    ),
  ),

  http.get('*/api/projects/manage', async ({ request }) => {
    await mockLatency()
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const ownerId = url.searchParams.get('ownerId')
    const keyword = url.searchParams.get('keyword')
    const filtered = projects.filter(
      (p) =>
        (!status || (status === 'default' ? p.isDefault : p.status === status)) &&
        (!ownerId || p.ownerId === ownerId) &&
        matchKeyword(keyword, p.name, p.code),
    )
    return HttpResponse.json(paginate(filtered, url))
  }),

  http.get('*/api/projects/stats', async () => {
    await mockLatency()
    return HttpResponse.json({
      total: projects.length,
      active: projects.filter((p) => p.status === 'active' && !p.isDefault).length,
      archived: projects.filter((p) => p.status === 'archived').length,
      defaultCount: projects.filter((p) => p.isDefault).length,
      memberCount: users.length,
      storageUsedTb: Number(projects.reduce((sum, p) => sum + p.dataSizeTb, 0).toFixed(1)),
      storageQuotaTb: 120,
    })
  }),

  http.post('*/api/projects', async ({ request }) => {
    await mockLatency()
    const input = (await request.json()) as ProjectFormInput
    if (projects.some((p) => p.code === input.code)) {
      return HttpResponse.json({ message: '项目标识已存在' }, { status: 409 })
    }
    const owner = users.find((u) => u.id === input.ownerId)
    const project: ProjectDetail = {
      ...input,
      id: input.code,
      ownerName: owner?.name ?? '—',
      status: 'active',
      memberCount: 1,
      dataSizeTb: 0,
      taskCount: 0,
      sceneCount: 0,
      createdAt: new Date().toISOString(),
    }
    projects.splice(1, 0, project)
    if (input.isDefault) ensureSingleDefault(project.id)
    return HttpResponse.json(project, { status: 201 })
  }),

  http.get<IdParams>('*/api/projects/:id', async ({ params }) => {
    await mockLatency()
    const project = findProject(params.id)
    return project ? HttpResponse.json(project) : notFound()
  }),

  http.put<IdParams>('*/api/projects/:id', async ({ params, request }) => {
    await mockLatency()
    const project = findProject(params.id)
    if (!project) return notFound()
    const input = (await request.json()) as ProjectFormInput
    const owner = users.find((u) => u.id === input.ownerId)
    Object.assign(project, input, { ownerName: owner?.name ?? project.ownerName })
    if (input.isDefault) ensureSingleDefault(project.id)
    return HttpResponse.json(project)
  }),

  http.post<IdParams>('*/api/projects/:id/archive', async ({ params }) => {
    await mockLatency()
    const project = findProject(params.id)
    if (!project) return notFound()
    if (project.isDefault) {
      return HttpResponse.json({ message: '默认项目不可归档' }, { status: 400 })
    }
    project.status = 'archived'
    return new HttpResponse(null, { status: 204 })
  }),

  http.post<IdParams>('*/api/projects/:id/restore', async ({ params }) => {
    await mockLatency()
    const project = findProject(params.id)
    if (!project) return notFound()
    project.status = 'active'
    return new HttpResponse(null, { status: 204 })
  }),

  http.get<IdParams>('*/api/projects/:id/overview', async ({ params }) => {
    await mockLatency()
    const project = findProject(params.id)
    return project ? HttpResponse.json(buildProjectOverview(project)) : notFound()
  }),

  http.get<IdParams>('*/api/projects/:id/resources', async ({ params }) => {
    await mockLatency()
    const project = findProject(params.id)
    return project ? HttpResponse.json(buildProjectResources(project)) : notFound()
  }),

  http.get<IdParams>('*/api/projects/:id/archive-impact', async ({ params }) => {
    await mockLatency()
    const project = findProject(params.id)
    if (!project) return notFound()
    return HttpResponse.json({
      runningTaskCount: Math.min(2, project.taskCount ?? 0),
      memberCount: project.memberCount,
      dataSizeTb: project.dataSizeTb,
      datasetCount: buildProjectOverview(project).datasetCount,
    })
  }),

  http.get<IdParams>('*/api/projects/:id/members', async ({ params }) => {
    await mockLatency()
    const project = findProject(params.id)
    return project ? HttpResponse.json(getProjectMembers(project)) : notFound()
  }),

  http.post<IdParams>('*/api/projects/:id/members', async ({ params, request }) => {
    await mockLatency()
    const project = findProject(params.id)
    if (!project) return notFound()
    const { userIds, ...setting } = (await request.json()) as ProjectMemberAddInput
    const members = getProjectMembers(project)
    users
      .filter((u) => userIds.includes(u.id) && !members.some((m) => m.userId === u.id))
      .forEach((u) =>
        members.push({
          ...setting,
          userId: u.id,
          name: u.name,
          account: u.account,
          joinedAt: new Date().toISOString(),
          lastActiveAt: u.lastLoginAt,
        }),
      )
    syncMemberCount(project)
    return new HttpResponse(null, { status: 204 })
  }),

  http.put<IdParams & { userId: string }>(
    '*/api/projects/:id/members/:userId',
    async ({ params, request }) => {
      await mockLatency()
      const project = findProject(params.id)
      if (!project) return notFound()
      const member = getProjectMembers(project).find((m) => m.userId === params.userId)
      if (!member) return HttpResponse.json({ message: '成员不存在' }, { status: 404 })
      Object.assign(member, (await request.json()) as ProjectMemberSetting)
      return HttpResponse.json(member)
    },
  ),

  http.delete<IdParams & { userId: string }>(
    '*/api/projects/:id/members/:userId',
    async ({ params }) => {
      await mockLatency()
      const project = findProject(params.id)
      if (!project) return notFound()
      const members = getProjectMembers(project)
      const index = members.findIndex((m) => m.userId === params.userId)
      if (index >= 0) members.splice(index, 1)
      syncMemberCount(project)
      return new HttpResponse(null, { status: 204 })
    },
  ),
]
