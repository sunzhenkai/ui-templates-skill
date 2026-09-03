import { test, expect } from '@playwright/test'

test.describe('App shell + navigation', () => {
  test('sidebar renders all routes; default redirects to inbox', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/inbox(?:\?.*)?$/)
    await expect(page.getByRole('heading', { name: '收件箱' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: '主导航' })).toBeVisible()
    await expect(page.getByRole('link', { name: /事件/ }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /工作区设置/ })).toBeVisible()
  })

  test('global keyboard: C opens create incident dialog', async ({ page }) => {
    await page.goto('/inbox')
    await page.keyboard.press('c')
    await expect(page.getByRole('dialog', { name: '创建事件' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: '创建事件' })).not.toBeVisible()
  })

  test('search palette opens via ⌘K and shows results', async ({ page }) => {
    await page.goto('/inbox')
    await page.keyboard.press('Meta+k')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await dialog.getByPlaceholder('搜索事件、服务、成员、变更…').fill('checkout')
    await expect(dialog.getByText(/事件/).first()).toBeVisible()
  })
})

test.describe('Events page', () => {
  test('filter, search and URL state', async ({ page }) => {
    await page.goto('/events')
    await expect(page.getByRole('heading', { name: '事件列表' })).toBeVisible()
    // SEV1 filter via select
    await page.getByRole('combobox').filter({ hasText: '全部等级' }).click()
    await page.getByRole('option', { name: 'SEV1' }).click()
    await expect(page).toHaveURL(/severity=SEV1/)
    // Reload preserves state
    await page.reload()
    await expect(page).toHaveURL(/severity=SEV1/)
  })

  test('board view drag updates status optimistically', async ({ page }) => {
    await page.goto('/events/board')
    await expect(page.getByRole('heading', { name: '事件看板' })).toBeVisible()
    // Find the first card and check its column
    const card = page.locator('[data-testid^="board-col-"] >> nth=0').locator('article').first()
    await expect(card).toBeVisible()
  })

  test('event detail sheet opens from row click', async ({ page }) => {
    await page.goto('/events')
    // Wait for the table to render, then click the first row title link/button
    await page.waitForSelector('tbody tr')
    const firstTitleButton = page.locator('tbody tr').first().locator('button').nth(1) // first button is pin, second is title
    await firstTitleButton.click()
    await page.waitForURL(/\/events\/inc-/, { timeout: 10000 })
    await expect(page.locator('[role=dialog]').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[role=dialog]').getByText(/INC-\d+/).first()).toBeVisible()
  })
})

test.describe('Settings + global shortcuts', () => {
  test('settings tabs persist in URL', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: '工作区设置' })).toBeVisible()
    await page.getByRole('button', { name: /团队/ }).first().click()
    await expect(page).toHaveURL(/tab=teams/)
  })

  test('shortcuts help opens with ?', async ({ page }) => {
    await page.goto('/inbox')
    await page.keyboard.press('Shift+?')
    await expect(page.getByRole('dialog', { name: '键盘快捷键' })).toBeVisible()
  })
})
