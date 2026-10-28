import { expect, test } from '@playwright/test'

test('首页重定向到任务管理并渲染布局', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/data-gen\/tasks/)
  await expect(page.getByText('世界模型数据生成系统')).toBeVisible()
  await expect(page.getByRole('heading', { name: '任务管理' })).toBeVisible()
})

test('通过多级侧栏菜单跳转页面', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('menuitem', { name: '数据集管理' }).click()
  await page.getByRole('menuitem', { name: '数据接入' }).click()
  await expect(page).toHaveURL(/\/dataset\/ingestion/)
  await expect(page.getByRole('heading', { name: '数据接入' })).toBeVisible()
})

test('命令面板搜索并跳转', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('ControlOrMeta+k')
  await page.keyboard.type('任务模板')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/data-gen\/task-templates/)
})
