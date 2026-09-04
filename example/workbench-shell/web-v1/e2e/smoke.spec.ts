import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const evidenceDir = path.resolve('.ui-template-apply/evidence')

test.beforeAll(() => {
  fs.mkdirSync(evidenceDir, { recursive: true })
})

test('smoke: inbox loads', async ({ page }) => {
  await page.goto('/ws-alpha/inbox')
  await expect(page.getByRole('heading', { name: '收件箱' })).toBeVisible()
})

test('create incident from shell', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('wb-prefs', JSON.stringify({
      state: { delayMs: 0, forceFail: false, theme: 'light', lastWorkspaceId: 'ws-alpha', sidebarWidth: 256, shortcutsEnabled: true, defaultHome: 'inbox', notificationsEnabled: true, columnVisibility: {}, columnWidths: {} },
      version: 0,
    }))
  })
  await page.goto('/ws-alpha/incidents')
  await page.getByRole('button', { name: '新建事件' }).click()
  await expect(page.getByRole('heading', { name: '创建事件' })).toBeVisible()
  await page.locator('#create-title').fill('E2E 创建事件')
  await page.getByRole('button', { name: '创建' }).click()
  await expect(page.getByText('影响服务必填')).toBeVisible({ timeout: 10_000 })
})

test('phase8: shell tokens, scroll owner, responsive, url restore', async ({ page, browserName }) => {
  test.setTimeout(60_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/ws-alpha/inbox')
  await expect(page.getByRole('heading', { name: '收件箱' })).toBeVisible()

  const metrics = await page.evaluate(() => {
    const root = document.documentElement
    const shell = document.querySelector('[data-slot="app-shell"]') as HTMLElement | null
    const canvas = document.querySelector('[data-slot="page-canvas"]') as HTMLElement | null
    const header = document.querySelector('[data-slot="page-header"]') as HTMLElement | null
    const cs = (el: Element | null) => (el ? getComputedStyle(el) : null)
    const rootCs = getComputedStyle(root)
    const bodyCs = getComputedStyle(document.body)
    return {
      htmlOverflow: rootCs.overflow,
      bodyOverflow: bodyCs.overflow,
      htmlHeight: rootCs.height,
      appShellBg: cs(shell)?.backgroundColor,
      pageCanvasBg: cs(canvas)?.backgroundColor,
      headerHeight: header?.getBoundingClientRect().height ?? null,
      sidebarMode: document.querySelector('[data-slot="app-sidebar"]')?.getAttribute('data-mode'),
      h1: document.querySelector('h1')?.textContent,
      currentNav: document.querySelector('[aria-current="page"]')?.textContent ?? document.querySelector('a[aria-current="page"]')?.getAttribute('href'),
    }
  })

  fs.writeFileSync(path.join(evidenceDir, 'phase8-computed-inbox-1440.json'), JSON.stringify({ browserName, viewport: '1440x900', theme: 'light', ...metrics }, null, 2))
  await page.screenshot({ path: path.join(evidenceDir, 'inbox-1440-light.png'), fullPage: false, animations: 'disabled', timeout: 8_000 })
  expect(metrics.htmlOverflow === 'hidden' || metrics.bodyOverflow === 'hidden').toBeTruthy()
  expect(metrics.headerHeight).toBeGreaterThan(40)
  expect(metrics.sidebarMode).toBe('expanded')

  await page.setViewportSize({ width: 1100, height: 800 })
  await page.waitForTimeout(200)
  const collapsed = await page.locator('[data-slot="app-sidebar"]').getAttribute('data-mode')
  fs.writeFileSync(path.join(evidenceDir, 'phase8-collapsed.json'), JSON.stringify({ mode: collapsed }))
  expect(collapsed).toBe('collapsed')

  await page.setViewportSize({ width: 900, height: 800 })
  await page.waitForTimeout(200)
  const overlay = await page.locator('[data-slot="app-sidebar"]').count()
  const trigger = page.getByRole('button', { name: '打开导航' })
  await expect(trigger).toBeVisible()
  fs.writeFileSync(path.join(evidenceDir, 'phase8-overlay.json'), JSON.stringify({ overlaySidebarInLayout: overlay, trigger: true }))

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/ws-alpha/incidents?status=in-progress&q=gateway', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: '事件列表' })).toBeVisible()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(/status=in-progress/)
  fs.writeFileSync(path.join(evidenceDir, 'phase8-url-restore.json'), JSON.stringify({ url: page.url() }))

  await page.goto('/ws-alpha/settings?tab=members', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: '工作区设置' })).toBeVisible()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(/tab=members/)

  await page.evaluate(() => document.documentElement.classList.add('dark'))
  const dark = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  fs.writeFileSync(path.join(evidenceDir, 'phase8-dark.json'), JSON.stringify({ backgroundColor: dark }))
  await page.screenshot({ path: path.join(evidenceDir, 'settings-dark.png'), animations: 'disabled', timeout: 8_000 })
  await page.waitForLoadState('domcontentloaded')
  const ax = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll("h1, h2, nav a, button, [role='dialog'], [aria-current]")]
    return nodes.slice(0, 80).map((el) => ({
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute("role"),
      name: (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80),
      current: el.getAttribute("aria-current"),
    }))
  })
  fs.writeFileSync(path.join(evidenceDir, "phase8-ax-settings.json"), JSON.stringify(ax, null, 2))
})
