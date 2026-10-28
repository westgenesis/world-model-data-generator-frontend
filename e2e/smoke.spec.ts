import { expect, test } from '@playwright/test'

test('首页重定向到任务管理并渲染布局', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/data-gen\/tasks/)
  await expect(page.getByText('世界模型数据生成系统')).toBeVisible()
  await expect(page.getByRole('heading', { name: '任务管理' })).toBeVisible()
})

test('切换顶部模块后侧栏随之切换', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: '数据集管理' }).click()
  await expect(page).toHaveURL(/\/dataset\//)
  await expect(page.getByRole('heading', { name: '数据接入' })).toBeVisible()
})
