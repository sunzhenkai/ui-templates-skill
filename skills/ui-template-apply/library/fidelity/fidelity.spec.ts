import fs from "node:fs"
import path from "node:path"
import { expect, test } from "@playwright/test"

type Entry = { id: string; type: string; tags?: string[] }

const indexPath = path.resolve(import.meta.dirname, "../../storybook-static/index.json")
const index = JSON.parse(fs.readFileSync(indexPath, "utf8")) as { entries: Record<string, Entry> }
// Only the kit's own stories have a baseline; project stories are not part of the fidelity contract.
const stories = Object.values(index.entries).filter(
  (entry) => entry.type === "story" && entry.id.startsWith("ui-kit-") && entry.tags?.includes("fidelity"),
)

test("fidelity stories are present", () => {
  expect(stories.length).toBeGreaterThan(0)
})

for (const theme of ["light", "dark"] as const) {
  for (const story of stories) {
    test(`${story.id} · ${theme}`, async ({ page }) => {
      await page.goto(`/iframe.html?id=${story.id}&viewMode=story&globals=theme:${theme}`)
      await page.locator("#storybook-root > *").first().waitFor()
      await page.evaluate(() => document.fonts.ready)
      await expect(page).toHaveScreenshot(`${story.id}--${theme}.png`, { fullPage: true })
    })
  }
}

// Hover and :focus-visible need a pointer and are invisible to a static baseline, so they get a behavioural check.
for (const theme of ["light", "dark"] as const) {
  test(`keyboard focus ring · ${theme}`, async ({ page }) => {
    await page.goto(`/iframe.html?id=ui-kit-primitives--states&viewMode=story&globals=theme:${theme}`)
    await page.locator("#storybook-root > *").first().waitFor()
    const button = page.getByRole("button", { name: "Save" })
    await button.focus()
    await page.keyboard.press("Shift+Tab")
    await page.keyboard.press("Tab")
    const ring = await button.evaluate((el) => {
      const style = getComputedStyle(el)
      return { visible: el.matches(":focus-visible"), width: Number.parseFloat(style.outlineWidth), style: style.outlineStyle }
    })
    expect(ring.visible).toBe(true)
    expect(ring.style).not.toBe("none")
    expect(ring.width).toBeGreaterThanOrEqual(2)
  })
}
