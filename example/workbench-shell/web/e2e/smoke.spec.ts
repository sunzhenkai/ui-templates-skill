import { expect, test } from "@playwright/test";

test.describe("workbench-shell web 冒烟", () => {
  test("默认路由重定向到收件箱且侧栏可达", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/inbox/);
    await page.getByRole("link", { name: /事件/ }).first().click();
    await expect(page).toHaveURL(/\/incidents/);
    await expect(page.getByRole("heading", { name: "事件" })).toBeVisible();
  });

  test("事件表格筛选与 URL 恢复", async ({ page }) => {
    await page.goto("/incidents");
    await page.getByLabel("搜索事件").fill("etl");
    await expect(page.getByText("INC-1001").first()).toBeVisible();
    await expect(page.getByText("INC-1005")).toBeHidden();
    await page.reload();
    await expect(page.getByLabel("搜索事件")).toHaveValue("etl");
  });

  test("⌘K 命令面板打开并可跳转", async ({ page }) => {
    await page.goto("/incidents");
    await page.keyboard.press("Control+k");
    await expect(page.getByRole("dialog", { name: "搜索" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "搜索" })).toBeHidden();
  });

  test("看板视图渲染列并支持视图切换 URL", async ({ page }) => {
    await page.goto("/incidents?view=board");
    await expect(page.getByRole("region", { name: "事件看板" })).toBeVisible();
  });

  test("窄屏 overlay 提供 PageHeader 导航触发器", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await page.goto("/incidents");
    await expect(page.getByRole("button", { name: "打开导航" })).toBeVisible();
    await page.getByRole("button", { name: "打开导航" }).click();
    await expect(page.getByRole("dialog", { name: "导航" })).toBeVisible();
    await page.getByRole("link", { name: /服务目录/ }).click();
    await expect(page).toHaveURL(/\/services/);
    await expect(page.getByRole("dialog", { name: "导航" })).toBeHidden();
  });

  test("404 状态提供返回", async ({ page }) => {
    await page.goto("/nope");
    await expect(page.getByText("页面不存在").first()).toBeVisible();
  });
});
