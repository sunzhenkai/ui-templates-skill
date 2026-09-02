import { expect, test } from '@playwright/test'

const routes = ['/inbox', '/events', '/board', '/services', '/on-call', '/analytics', '/settings']

test('核心路由可用，页面无控制台错误，根容器只保留内容滚动', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/events')
  await expect(page.getByRole('heading', { name: '事件列表' })).toBeVisible({ timeout: 10_000 })
  if (testInfo.project.name === 'desktop') {
    await expect(page.getByRole('navigation', { name: '工作区导航' })).toBeVisible()
  } else {
    await expect(page.getByRole('button', { name: '打开导航抽屉' })).toBeVisible()
  }
  const overflow = await page.evaluate(() => getComputedStyle(document.body).overflowY)
  expect(overflow).toBe('hidden')
  const metrics = await page.evaluate(() => {
    const nav = document.querySelector('[aria-label="工作区导航"] a')
    const heading = document.querySelector('main header h1')
    const main = document.querySelector('main')
    return {
      navFont: nav ? getComputedStyle(nav).fontSize : '',
      navLine: nav ? getComputedStyle(nav).lineHeight : '',
      headingHeight: heading ? heading.getBoundingClientRect().height : 0,
      canvasRadius: main ? getComputedStyle(main).borderRadius : '',
    }
  })
  expect(metrics).toMatchObject({ navFont: '14px', navLine: '20px', headingHeight: 20, canvasRadius: '14px' })
  for (const route of routes) {
    await page.goto(route)
    await expect(page.locator('main')).toBeVisible()
  }
  expect(errors).toEqual([])
  await page.screenshot({ path: testInfo.outputPath(`events-${testInfo.project.name}.png`), fullPage: true })
})

test('窄屏使用页头导航触发器，抽屉路由后自动关闭', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 760 })
  await page.goto('/events')
  await expect(page.getByRole('button', { name: '打开导航抽屉' })).toBeVisible()
  await page.getByRole('button', { name: '打开导航抽屉' }).click()
  const drawer = page.getByRole('dialog', { name: '导航抽屉' })
  await expect(drawer).toBeVisible()
  await drawer.getByRole('link', { name: /服务目录/ }).click()
  await expect(page.getByRole('heading', { name: '服务目录' })).toBeVisible()
  await expect(drawer).toBeHidden()
})

test('全局创建事件可从事件列表完成关键流程', async ({ page }) => {
  await page.goto('/events')
  await page.getByRole('button', { name: '新建事件' }).click()
  await page.getByRole('textbox', { name: '标题' }).fill('E2E 事件')
  await page.locator('#incident-service').selectOption({ label: 'API Gateway' })
  await page.getByRole('button', { name: '创建事件', exact: true }).click()
  await expect(page.getByText('事件已创建')).toBeVisible()
  await expect(page.getByText('E2E 事件')).toBeVisible()
})
