import dayjs from 'dayjs'
import { http, HttpResponse } from 'msw'
import type { User, UserCreateInput, UserImportRow, UserUpdateInput } from '@/api/users'
import type { UserStatus } from '@/constants/enums'
import { users } from '../db/user-service'
import { matchKeyword, mockLatency, paginate } from '../utils'

/** 导入预览的固定返回，取自原型 */
const IMPORT_PREVIEW: UserImportRow[] = [
  {
    name: '赵工',
    account: 'zhao.gong.import',
    department: 'algorithm',
    role: 'algorithm_engineer',
    error: null,
  },
  {
    name: '钱工',
    account: 'qian.gong.import',
    department: 'data_operation',
    role: 'annotator',
    error: null,
  },
  { name: '孙工', account: '', department: 'data_platform', role: 'data_admin', error: '账号为空' },
]

/**
 * 判断账号是否已被占用
 * @param account - 登录账号
 */
const isAccountTaken = (account: string) => users.some((u) => u.account === account)

/**
 * 根据 ID 查找用户
 * @param id - 用户 ID
 */
const findUser = (id: string) => users.find((u) => u.id === id)

export const userHandlers = [
  http.get('*/api/users/stats', async () => {
    await mockLatency()
    const monthStart = dayjs().startOf('month')
    return HttpResponse.json({
      total: users.length,
      enabled: users.filter((u) => u.status === 'enabled').length,
      disabled: users.filter((u) => u.status === 'disabled').length,
      newThisMonth: users.filter((u) => dayjs(u.createdAt).isAfter(monthStart)).length,
    })
  }),

  http.get('*/api/users/options', () =>
    HttpResponse.json(
      users
        .filter((u) => u.status === 'enabled')
        .map(({ id, name, account, department, role }) => ({
          id,
          name,
          account,
          department,
          role,
        })),
    ),
  ),

  http.get('*/api/users/import/template', () =>
    HttpResponse.text('姓名,账号,部门,角色\n', {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="user-import-template.csv"',
      },
    }),
  ),

  http.get('*/api/users', async ({ request }) => {
    await mockLatency()
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const keyword = url.searchParams.get('keyword')
    const filtered = users.filter(
      (u) => (!status || u.status === status) && matchKeyword(keyword, u.name, u.account),
    )
    return HttpResponse.json(paginate(filtered, url))
  }),

  http.post('*/api/users', async ({ request }) => {
    await mockLatency()
    const input = (await request.json()) as UserCreateInput
    if (isAccountTaken(input.account)) {
      return HttpResponse.json({ message: '登录账号已存在' }, { status: 409 })
    }
    const user: User = {
      id: `U-${Date.now()}`,
      name: input.name,
      account: input.account,
      phone: input.phone || null,
      email: input.email || null,
      department: input.department,
      role: 'guest',
      status: 'enabled',
      lastLoginAt: null,
      createdAt: new Date().toISOString(),
    }
    users.unshift(user)
    return HttpResponse.json(user, { status: 201 })
  }),

  http.put<{ id: string }>('*/api/users/:id', async ({ params, request }) => {
    await mockLatency()
    const user = findUser(params.id)
    if (!user) return HttpResponse.json({ message: '用户不存在' }, { status: 404 })
    const input = (await request.json()) as UserUpdateInput
    Object.assign(user, { ...input, phone: input.phone || null, email: input.email || null })
    return HttpResponse.json(user)
  }),

  http.patch<{ id: string }>('*/api/users/:id/status', async ({ params, request }) => {
    await mockLatency()
    const user = findUser(params.id)
    if (!user) return HttpResponse.json({ message: '用户不存在' }, { status: 404 })
    const { status } = (await request.json()) as { status: UserStatus }
    user.status = status
    return HttpResponse.json(user)
  }),

  http.post<{ id: string }>('*/api/users/:id/grants', async ({ params }) => {
    await mockLatency()
    if (!findUser(params.id)) return HttpResponse.json({ message: '用户不存在' }, { status: 404 })
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('*/api/users/import/preview', async () => {
    await mockLatency()
    return HttpResponse.json(
      IMPORT_PREVIEW.map((row) =>
        row.error || !isAccountTaken(row.account) ? row : { ...row, error: '账号已存在' },
      ),
    )
  }),

  http.post('*/api/users/import', async ({ request }) => {
    await mockLatency()
    const { rows } = (await request.json()) as { rows: UserImportRow[] }
    const valid = rows.filter((r) => !r.error && r.account && !isAccountTaken(r.account))
    valid.forEach((r, i) =>
      users.unshift({
        id: `U-${Date.now()}-${i}`,
        name: r.name,
        account: r.account,
        phone: null,
        email: null,
        department: r.department ?? 'data_platform',
        role: r.role ?? 'guest',
        status: 'enabled',
        lastLoginAt: null,
        createdAt: new Date().toISOString(),
      }),
    )
    return HttpResponse.json({ imported: valid.length })
  }),
]
