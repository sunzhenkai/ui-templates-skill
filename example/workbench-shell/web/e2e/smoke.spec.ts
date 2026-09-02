import { expect, test } from "@playwright/test"

test("smoke: app loads and navigation works", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { name: "收件箱" })).toBeVisible()

  // 侧栏导航
  await page.getByRole("button", { name: "事件列表" }).click()
  await expect(page.getByRole("heading", { name: "事件" })).toBeVisible()

  await page.getByRole("button", { name: "服务目录" }).click()
  await expect(page.getByRole("heading", { name: "服务目录" })).toBeVisible()

  // 全局搜索快捷键
  await page.keyboard.press("Control+K")
  await expect(page.getByPlaceholder("搜索事件、服务、成员、变更…")).toBeVisible()
  await page.keyboard.press("Escape")

  // 创建事件快捷键
  await page.keyboard.press("c")
  await expect(page.getByRole("heading", { name: "创建事件" })).toBeVisible()
  await page.getByRole("button", { name: "取消" }).click()
})
