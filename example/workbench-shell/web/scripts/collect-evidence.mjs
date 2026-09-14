import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const baseURL = process.env.EVIDENCE_BASE_URL || 'http://127.0.0.1:4173'
const output = path.resolve('.ui-template-apply/evidence')
await fs.mkdir(output, { recursive: true })

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' })
const page = await context.newPage()
const measurements = {}

async function computed(locator, properties) {
  return locator.evaluate((element, props) => {
    const style = getComputedStyle(element)
    return Object.fromEntries(props.map((property) => [property, style.getPropertyValue(property)]))
  }, properties)
}

async function box(locator) {
  const value = await locator.boundingBox()
  return value ? { x: value.x, y: value.y, width: value.width, height: value.height } : null
}

await page.goto(`${baseURL}/incidents`)
await page.getByTestId('incidents-page').waitFor()
await page.screenshot({ path: path.join(output, 'incidents-desktop.png'), fullPage: true })
const sidebar = page.getByTestId('app-sidebar')
const workspaceShell = page.locator('main > div').first()
measurements.incidents = {
  sidebar: { box: await box(sidebar), style: await computed(sidebar, ['background-color', 'border-right-width', 'color']) },
  canvas: { box: await box(workspaceShell), style: await computed(workspaceShell, ['background-color', 'border-radius', 'box-shadow', 'border-width']) },
  header: { box: await box(page.locator('header').first()), style: await computed(page.locator('header').first(), ['height', 'border-bottom-width']) },
  navItem: { box: await box(page.locator('aside a').first()), style: await computed(page.locator('aside a').first(), ['background-color', 'border-radius', 'color']) },
  aria: await page.locator('main').ariaSnapshot().catch(() => 'aria snapshot unavailable'),
}

await page.getByRole('button', { name: '搜索' }).last().click()
const search = page.getByRole('dialog', { name: '全局搜索' })
await search.waitFor()
measurements.command = { box: await box(search), style: await computed(search, ['background-color', 'border-radius', 'box-shadow', 'padding']) }
await page.screenshot({ path: path.join(output, 'command-palette.png'), fullPage: true })
await page.keyboard.press('Escape')

await page.getByRole('button', { name: '创建事件' }).last().click()
const create = page.getByRole('dialog', { name: '创建事件' })
await create.waitFor()
measurements.dialog = { box: await box(create), style: await computed(create, ['background-color', 'border-radius', 'box-shadow', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left']) }
await page.screenshot({ path: path.join(output, 'create-dialog.png'), fullPage: true })
await page.keyboard.press('Escape')

await page.goto(`${baseURL}/board`)
await page.getByTestId('board-page').waitFor()
await page.screenshot({ path: path.join(output, 'board-desktop.png'), fullPage: true })

await page.goto(`${baseURL}/incidents/inc-1042`)
await page.getByTestId('incident-detail-page').waitFor()
await page.screenshot({ path: path.join(output, 'detail-desktop.png'), fullPage: true })
measurements.detail = {
  rootOverflow: await computed(page.locator('main'), ['overflow']),
  bodyText: await page.locator('main').innerText().then((text) => text.slice(0, 200)),
}

await page.goto(`${baseURL}/analytics`)
await page.getByTestId('analytics-page').waitFor()
await page.screenshot({ path: path.join(output, 'analytics-desktop.png'), fullPage: true })

await page.goto(`${baseURL}/settings`)
await page.getByTestId('settings-page').waitFor()
await page.screenshot({ path: path.join(output, 'settings-desktop.png'), fullPage: true })

await page.getByRole('button', { name: '切换主题' }).click()
await page.screenshot({ path: path.join(output, 'settings-light.png'), fullPage: true })
measurements.lightTheme = { htmlClass: await page.locator('html').getAttribute('class') }

const compact = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' })
const mobile = await compact.newPage()
await mobile.goto(`${baseURL}/incidents`)
await mobile.getByTestId('incidents-page').waitFor()
await mobile.screenshot({ path: path.join(output, 'incidents-compact.png'), fullPage: true })
measurements.compact = { viewport: mobile.viewportSize(), sidebarBox: await box(mobile.getByTestId('app-sidebar')) }
await compact.close()

await fs.writeFile(path.join(output, 'measurements.json'), `${JSON.stringify(measurements, null, 2)}\n`, 'utf8')
await browser.close()
console.log(JSON.stringify({ status: 'captured', output, measurements: Object.keys(measurements) }))
