import { expect, test } from "@playwright/test";

test.describe("smoke：核心链路", () => {
  test("壳层与事件列表可访问", async ({ page }) => {
    await page.goto("/incidents");
    await expect(page.getByRole("heading", { name: "事件" })).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible({ timeout: 8000 });
  });

  test("⌘K 打开全局搜索并搜索", async ({ page }) => {
    await page.goto("/inbox");
    await expect(page.getByRole("button", { name: /全局搜索/ })).toBeVisible({ timeout: 8000 });
    await page.keyboard.press("Control+k");
    const dialog = page.getByRole("dialog", { name: "全局搜索" });
    await expect(dialog).toBeVisible();
    await page.keyboard.type("网关");
    await expect(page.getByText(/ENG-1201|网关 5xx 激增/).first()).toBeVisible({ timeout: 8000 });
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });

  test("创建事件并出现在列表", async ({ page }) => {
    await page.goto("/incidents");
    await page.getByRole("button", { name: /新建事件/ }).click();
    const dialog = page.getByRole("dialog", { name: "创建事件" });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel(/标题/).fill("E2E 冒烟事件");
    await dialog.getByLabel(/影响服务/).selectOption("svc-gateway");
    await dialog.getByRole("button", { name: "提交" }).click();
    await expect(dialog).not.toBeVisible({ timeout: 8000 });
    await expect(page.locator("tbody tr").first()).toContainText("E2E 冒烟事件", { timeout: 8000 });
  });
});
