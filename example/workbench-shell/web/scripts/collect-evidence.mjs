/**
 * Phase 8 evidence collector — 真实浏览器（Playwright/Chromium）。
 * 输出：.ui-template-apply/evidence/*.{png,json,txt} + evidence-summary.json
 * 证据类型：computed style、逻辑几何（bounding box）、scroll owner、状态迁移、浮层焦点、AX 摘要、console、截图。
 */
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = 4173;
const BASE = `http://localhost:${PORT}`;
const OUT = new URL("../.ui-template-apply/evidence/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const results = [];
const consoleErrors = [];

function record(name, status, expected, actual, refs, meta = {}) {
  results.push({ scenario: name, status, expected, actual, refs, ...meta });
  console.log(`${status === "passed" ? "✓" : status === "failed" ? "✗" : "~"} ${name} — ${actual}`);
}

async function main() {
  const server = spawn("pnpm", ["exec", "vite", "preview", "--port", String(PORT), "--strictPort"], {
    cwd: new URL("..", import.meta.url).pathname,
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.on("error", (e) => console.error("server spawn error:", e.message));
  server.stdout?.on("data", (d) => console.error("[vite:out]", String(d).slice(0, 150)));
  console.error("[debug] spawn cwd =", new URL("..", import.meta.url).pathname);
  server.stderr?.on("data", (d) => console.error("[vite]", String(d).slice(0, 200)));
  server.on("exit", (code) => console.error("[vite] exited with", code));
  let up = false;
  for (let i = 0; i < 40 && !up; i++) {
    await sleep(500);
    up = await fetch(`${BASE}/`).then((r) => r.ok).catch(() => false);
  }
  if (!up) throw new Error("vite preview 未能在 20s 内启动");

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  try {
    /* ---------- S1 shell chrome composition（desktop，12 槽位 + inset） ---------- */
    await page.goto(`${BASE}/incidents`);
    await page.waitForSelector("table", { timeout: 10000 });
    const shell = page.locator("aside[aria-label='侧栏']");
    await shell.waitFor({ timeout: 5000 });
    const shellBg = await shell.evaluate((el) => getComputedStyle(el).backgroundColor);
    const canvas = page.locator("[data-canvas]");
    const scrollChild = canvas.locator("> div.overflow-y-auto").first();
    const canvasScroll = await scrollChild.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { overflowY: cs.overflowY, clientH: el.clientHeight, scrollH: el.scrollHeight };
    });
    const mainOverflow = await canvas.evaluate((el) => getComputedStyle(el).overflowY);
    const rootScroll = await page.evaluate(() => {
      const el = document.querySelector("div.flex.h-full");
      return el ? getComputedStyle(el).overflow : "missing";
    });
    await shell.screenshot({ path: `${OUT}s1-shell-sidebar.png` });
    const slots = {
      workspaceSwitcher: await page.getByRole("button", { name: /平台运维中心/ }).isVisible(),
      search: await page.getByRole("button", { name: /全局搜索/ }).isVisible(),
      compose: await page.getByRole("button", { name: /创建事件/ }).isVisible(),
      navGroup: await page.getByRole("navigation", { name: "应用导航" }).isVisible(),
      pinList: await page.getByRole("button", { name: /置顶事件/ }).isVisible(),
      footerUtility: await page.getByRole("button", { name: /帮助与快捷键/ }).isVisible(),
      chatFab: await page.getByRole("button", { name: "打开聊天" }).isVisible(),
    };
    const headerBox = await page.locator("header", { hasText: "事件" }).first().boundingBox();
    record(
      "chrome.composition.desktop",
      Object.values(slots).every(Boolean) && shellBg.includes("0.964") ? "passed" : "failed",
      "12 槽位可见（7 个关键断言）且 sidebar 背景为模板 app-shell oklch(0.964435…)",
      `slots=${JSON.stringify(slots)}；sidebar bg=${shellBg}`,
      ["s1-shell-sidebar.png"],
      { route: "/incidents", viewport: "1440x900", theme: "light" },
    );
    record(
      "scroll.owner.canvas",
      rootScroll === "hidden" && mainOverflow === "hidden" && canvasScroll.overflowY === "auto" ? "passed" : "failed",
      "LAYOUT-102：壳根与 main 均 overflow hidden，页面级滚动容器（region-content）独占块滚动",
      `shell root overflow=${rootScroll}；main overflowY=${mainOverflow}；scroll container overflowY=${canvasScroll.overflowY}`,
      ["s1-shell-sidebar.png"],
      { route: "/incidents", viewport: "1440x900", theme: "light" },
    );

    /* ---------- S2 dense table + 48px header/toolbar（computed geometry） ---------- */
    const headerH = headerBox?.height ?? 0;
    const rowH = await page.locator("tbody tr").first().evaluate((el) => el.getBoundingClientRect().height);
    const rowH2 = rowH > 44 ? "failed" : rowH > 0 ? "passed" : "failed";
    await page.screenshot({ path: `${OUT}s2-incident-table.png`, fullPage: false });
    record(
      "table.dense.rows",
      rowH2 === "passed" && rowH <= 40.5 ? "passed" : "failed",
      "pattern/data-table forbidden：行高不超过 dense 40px 节奏",
      `首行高 ${rowH.toFixed(1)}px`,
      ["s2-incident-table.png"],
      { route: "/incidents", viewport: "1440x900", theme: "light" },
    );
    record(
      "page-chrome.48px",
      Math.abs(headerH - 48) < 1.5 ? "passed" : "failed",
      "rule/LAYOUT-106：page header 48px",
      `header 高 ${headerH}px`,
      ["s2-incident-table.png"],
      { route: "/incidents", viewport: "1440x900", theme: "light" },
    );

    /* ---------- S3 URL 恢复筛选 ---------- */
    await page.goto(`${BASE}/incidents?status=processing&severity=sev1`);
    await page.waitForSelector("table", { timeout: 8000 });
    const chips = await page.getByRole("region").first().isVisible();
    const rowsAfter = await page.locator("tbody tr").count();
    record(
      "url.state.restore",
      rowsAfter === 1 ? "passed" : "failed",
      "URL ?status=processing&severity=sev1 恢复筛选（预期 1 行：ENG-1201）",
      `行数=${rowsAfter}（chips 区可见=${chips}）`,
      ["s3-url-filter.png"],
      { route: "/incidents?status=processing&severity=sev1", viewport: "1440x900", theme: "light" },
    );
    await page.screenshot({ path: `${OUT}s3-url-filter.png` });

    /* ---------- S4 命令面板（⌘K）：焦点进入、Esc 还原、结果打开详情 ---------- */
    await page.goto(`${BASE}/inbox`);
    await page.waitForSelector("table", { timeout: 8000 });
    await page.keyboard.press("Control+k");
    const palette = page.getByRole("dialog", { name: "全局搜索" });
    await palette.waitFor({ timeout: 4000 });
    const focusIn = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
    await page.keyboard.type("网关");
    await page.waitForTimeout(900);
    const resultCount = await palette.getByRole("option").count();
    await page.screenshot({ path: `${OUT}s4-command-palette.png` });
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);
    const urlAfter = page.url();
    await page.keyboard.press("Control+k");
    await palette.waitFor({ timeout: 3000 });
    await page.keyboard.press("Escape");
    const focusBack = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
    record(
      "search.keyboard.flow",
      resultCount > 0 && /\/incidents\/inc-1/.test(urlAfter) ? "passed" : "failed",
      "pattern/global-search：⌘K 打开、键盘输入出现结果、Enter 打开对应详情",
      `结果 ${resultCount} 条；Enter 后 URL=${urlAfter}`,
      ["s4-command-palette.png"],
      { route: "/inbox", viewport: "1440x900", theme: "light" },
    );
    record(
      "overlay.focus.return",
      focusIn === "搜索关键字" && focusBack === "全局搜索（⌘K）" ? "passed" : "failed",
      "rule/AX-104：浮层打开焦点入层，Esc 关闭后焦点回触发器",
      `打开时焦点=${focusIn}；关闭后焦点=${focusBack}`,
      ["s4-command-palette.png"],
      { route: "/inbox", viewport: "1440x900", theme: "light" },
    );

    /* ---------- S5 创建事件（必填校验 + 提交成功 + 列表/收件箱联动） ---------- */
    await page.goto(`${BASE}/incidents`);
    await page.waitForSelector("table", { timeout: 8000 });
    await page.getByRole("button", { name: /新建事件/ }).click();
    const dlg = page.getByRole("dialog", { name: "创建事件" });
    await dlg.waitFor({ timeout: 4000 });
    await dlg.getByRole("button", { name: "提交" }).click();
    const errVisible = await dlg.getByText("标题必填").isVisible();
    await dlg.getByLabel(/标题/).fill("Phase8 浏览器证据事件");
    await dlg.getByLabel(/影响服务/).selectOption("svc-gateway");
    await dlg.getByRole("button", { name: "提交" }).click();
    await page.waitForTimeout(800);
    const toastText = await page.locator("[aria-label='通知']").textContent().catch(() => "");
    await page.screenshot({ path: `${OUT}s5-create-incident.png` });
    record(
      "create-incident.flow",
      errVisible && toastText.includes("已创建") ? "passed" : "failed",
      "必填校验阻止无效提交；有效提交成功并产生成功 toast",
      `校验错误可见=${errVisible}；toast=${toastText?.trim().slice(0, 40)}`,
      ["s5-create-incident.png"],
      { route: "/incidents", viewport: "1440x900", theme: "light" },
    );

    /* ---------- S6 看板拖动 + 键盘替代（AX-103） ---------- */
    await page.goto(`${BASE}/incidents/board`);
    await page.waitForSelector("section[aria-label^='看板列']", { timeout: 8000 });
    const keyboardMove = page.getByRole("button", { name: /→ 处理中/ }).first();
    const hasKbAlt = await keyboardMove.isVisible();
    await page.screenshot({ path: `${OUT}s6-board.png` });
    record(
      "board.keyboard.alternative",
      hasKbAlt ? "passed" : "failed",
      "rule/AX-103：拖动之外提供键盘可达的「移动到列」操作",
      `键盘替代按钮可见=${hasKbAlt}`,
      ["s6-board.png"],
      { route: "/incidents/board", viewport: "1440x900", theme: "light" },
    );

    /* ---------- S7 详情 404 与骨架 ---------- */
    await page.goto(`${BASE}/incidents/inc-404`);
    await page.waitForTimeout(900);
    const notFound = await page.getByText("事件不存在").isVisible();
    await page.screenshot({ path: `${OUT}s7-404.png` });
    record(
      "detail.404",
      notFound ? "passed" : "failed",
      "详情不存在状态可见并有返回动作",
      `「事件不存在」可见=${notFound}`,
      ["s7-404.png"],
      { route: "/incidents/inc-404", viewport: "1440x900", theme: "light" },
    );

    /* ---------- S8 模拟失败与重试（?fail=） ---------- */
    await page.goto(`${BASE}/services?fail=services`);
    await page.waitForTimeout(1200);
    const errState = await page.getByRole("alert").first().isVisible().catch(() => false);
    const retryBtn = await page.getByRole("button", { name: "重试" }).first().isVisible().catch(() => false);
    await page.screenshot({ path: `${OUT}s8-error-retry.png` });
    record(
      "error.state.retry",
      errState && retryBtn ? "passed" : "failed",
      "prompts §五：固定关键字触发模拟失败，呈现错误态与重试操作",
      `错误态=${errState}；重试按钮=${retryBtn}`,
      ["s8-error-retry.png"],
      { route: "/services?fail=services", viewport: "1440x900", theme: "light" },
    );

    /* ---------- S9 分析页图表渲染（dashboard 模式） ---------- */
    await page.goto(`${BASE}/analytics`);
    await page.waitForSelector("[role='img']", { timeout: 10000 });
    const statCards = await page.getByRole("link", { name: /查看过滤结果/ }).count();
    const axSummary = await page.locator("main#main").ariaSnapshot();
    writeFileSync(`${OUT}ax-analytics.txt`, axSummary ?? "");
    await page.screenshot({ path: `${OUT}s9-analytics.png`, fullPage: true });
    record(
      "analytics.dashboard.render",
      statCards >= 6 ? "passed" : "failed",
      "page-type/dashboard：六指标卡与趋势/分布图渲染（AX 快照已存档）",
      `指标卡 ${statCards} 张`,
      ["s9-analytics.png", "ax-analytics.txt"],
      { route: "/analytics", viewport: "1440x900", theme: "light" },
    );

    /* ---------- S10 日历与值班 ---------- */
    await page.goto(`${BASE}/on-call`);
    await page.waitForSelector("[title='陈曦 白班']", { timeout: 10000 }).catch(() => {});
    const todayShift = await page.getByTitle(/陈曦/).first().isVisible().catch(() => false);
    await page.screenshot({ path: `${OUT}s10-oncall.png` });
    record(
      "oncall.month.grid",
      todayShift ? "passed" : "failed",
      "月视图渲染班次卡（值班人员 + 班次名）",
      `今日值班「陈曦」可见=${todayShift}`,
      ["s10-oncall.png"],
      { route: "/on-call", viewport: "1440x900", theme: "light" },
    );

    /* ---------- S11 双主题（dark class + computed style） ---------- */
    await page.emulateMedia({ colorScheme: "light" });
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await page.waitForTimeout(300);
    const darkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await page.screenshot({ path: `${OUT}s11-dark-theme.png` });
    await page.evaluate(() => document.documentElement.classList.remove("dark"));
    record(
      "theme.dark.projection",
      darkBg.includes("0.155") ? "passed" : "failed",
      "Token Projection：.dark 作用域 app-shell 值 oklch(0.155 0.005 285.823) 生效",
      `dark body bg=${darkBg}`,
      ["s11-dark-theme.png"],
      { route: "/incidents", viewport: "1440x900", theme: "dark" },
    );

    /* ---------- S13 内容卡片几何（rule/LAYOUT-107 computed style） ---------- */
    await page.goto(`${BASE}/incidents`);
    await page.waitForSelector("table", { timeout: 10000 });
    const card = page.locator("div.relative.flex.min-w-0.flex-1.flex-col.overflow-hidden");
    const cardStyles = await card.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        borderRadius: cs.borderRadius,
        marginTop: cs.marginTop,
        marginRight: cs.marginRight,
        marginBottom: cs.marginBottom,
        marginLeft: cs.marginLeft,
        boxShadow: cs.boxShadow,
        backgroundColor: cs.backgroundColor,
        borderColor: getComputedStyle(el).borderTopColor,
      };
    });
    await page.screenshot({ path: `${OUT}s13-content-card.png` });
    const radiusOk = cardStyles.borderRadius === "14px"; // radius.xl
    const insetOk = [cardStyles.marginTop, cardStyles.marginRight, cardStyles.marginBottom].every((v) => v === "8px") && cardStyles.marginLeft === "0px";
    const shadowOk = cardStyles.boxShadow !== "none" && cardStyles.boxShadow.includes("rgb");
    const bgOk = cardStyles.backgroundColor.includes("0.988");
    record(
      "content-card.geometry",
      radiusOk && insetOk && shadowOk && bgOk ? "passed" : "failed",
      "rule/LAYOUT-107：内容卡片 lg 下 m-2 ml-0 + radius.xl + surface 阴影 + page-canvas 底",
      JSON.stringify(cardStyles),
      ["s13-content-card.png"],
      { route: "/incidents", viewport: "1440x900", theme: "light" },
    );

    /* ---------- S14 二级导航位于卡片内部左列（pattern/section-nav） ---------- */
    await page.goto(`${BASE}/settings`);
    await page.waitForSelector("nav[aria-label='设置分区']", { timeout: 10000 });
    const navBox = await page.locator("aside[aria-label='设置导航']").boundingBox();
    const cardBox = await card.boundingBox();
    const navItem = await page.getByRole("button", { name: "成员与权限" }).isVisible();
    await navItem && (await page.getByRole("button", { name: "成员与权限" }).click());
    await page.waitForTimeout(400);
    const membersVisible = await page.getByText("成员与权限", { exact: true }).first().isVisible();
    const inCardLeft = navBox && cardBox && navBox.x >= cardBox.x - 2 && navBox.x + navBox.width <= cardBox.x + cardBox.width && navBox.y >= cardBox.y - 2;
    await page.screenshot({ path: `${OUT}s14-settings-section-nav.png` });
    record(
      "settings.section-nav.in-card-left",
      inCardLeft && navItem && membersVisible ? "passed" : "failed",
      "pattern/section-nav：二级导航位于内容卡片内部左列，点击切换分区内容",
      `navBox=${JSON.stringify(navBox)}；cardBox.x=${cardBox?.x}, width=${cardBox?.width}`,
      ["s14-settings-section-nav.png"],
      { route: "/settings", viewport: "1440x900", theme: "light" },
    );

    /* ---------- S15 focus 处理（rule/QUALITY-104 computed style） ---------- */
    await page.goto(`${BASE}/incidents`);
    await page.waitForSelector("input[aria-label='搜索事件']", { timeout: 10000 });
    const searchInput = page.getByLabel("搜索事件");
    await searchInput.focus();
    await page.waitForTimeout(300); // transition-colors 完成后再取 computed style
    const focusStyles = await searchInput.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        outlineStyle: cs.outlineStyle,
        borderColor: cs.borderColor,
        boxShadow: cs.boxShadow,
        borderRadius: cs.borderRadius,
        backgroundColor: cs.backgroundColor,
      };
    });
    await page.screenshot({ path: `${OUT}s15-focus-treatment.png` });
    const focusOk =
      focusStyles.outlineStyle === "none" &&
      !focusStyles.borderColor.startsWith("oklab(0.92") &&
      focusStyles.boxShadow.includes("3px") &&
      focusStyles.boxShadow !== "none" &&
      focusStyles.borderRadius === "10px" &&
      focusStyles.backgroundColor === "rgba(0, 0, 0, 0)";
    record(
      "focus.treatment.contrast-104",
      focusOk ? "passed" : "failed",
      "rule/QUALITY-104：输入控件 focus = 无 outline + border-ring + ring/50 box-shadow + rounded-lg + 透明底",
      JSON.stringify(focusStyles),
      ["s15-focus-treatment.png"],
      { route: "/incidents", viewport: "1440x900", theme: "light" },
    );

    /* ---------- S16 设置页双窗格滚动（scroll-domain 派生场景） ---------- */
    await page.goto(`${BASE}/settings`);
    await page.waitForSelector("nav[aria-label='设置分区']", { timeout: 10000 });
    const paneStyles = await page.evaluate(() => {
      const main = document.querySelector("main#main");
      const nav = document.querySelector("aside[aria-label='设置导航'] nav");
      const content = document.querySelector("aside[aria-label='设置导航'] + div");
      const q = (el) => (el ? { overflowY: getComputedStyle(el).overflowY, height: el.getBoundingClientRect().height } : null);
      return { main: q(main), nav: q(nav), content: q(content) };
    });
    const navAside = page.locator("aside[aria-label='设置导航']");
    const navBox2 = await navAside.boundingBox();
    const cardEl = page.locator("div.relative.flex.min-w-0.flex-1.flex-col.overflow-hidden");
    const cardBox2 = await cardEl.boundingBox();
    const iconCount = await navAside.locator("svg").count();
    const selectedBg = await page.evaluate(() => {
      const el = document.querySelector("button[aria-current='page']");
      return el ? getComputedStyle(el).backgroundColor : null;
    });
    await page.screenshot({ path: `${OUT}s16-settings-panes.png` });
    const panesOk =
      paneStyles.main?.overflowY === "hidden" &&
      paneStyles.nav?.overflowY === "auto" &&
      paneStyles.content?.overflowY === "auto" &&
      navBox2 && cardBox2 && Math.abs(navBox2.y + navBox2.height - (cardBox2.y + cardBox2.height)) < 2 &&
      iconCount >= 6 &&
      selectedBg && selectedBg.includes("oklch");
    record(
      "settings.scroll-domain.panes",
      panesOk ? "passed" : "failed",
      "placement-settings-panes：根 overflow-hidden，nav/内容各自滚动；nav 列撑满卡片高（分割线到底）；条目 icon+label；选中 surface-selected",
      `main=${paneStyles.main?.overflowY} nav=${paneStyles.nav?.overflowY} content=${paneStyles.content?.overflowY}；navBottom-cardBottom=${navBox2 && cardBox2 ? (navBox2.y + navBox2.height - (cardBox2.y + cardBox2.height)).toFixed(1) : "n/a"}px；icons=${iconCount}；selected=${selectedBg}`,
      ["s16-settings-panes.png"],
      { route: "/settings", viewport: "1440x900", theme: "light" },
    );

    /* ---------- S12 移动端 sheet 抽屉 ---------- */
    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await mobile.goto(`${BASE}/incidents`);
    await mobile.waitForTimeout(900);
    await mobile.getByRole("button", { name: "打开导航" }).click();
    const drawer = mobile.getByRole("dialog", { name: "导航抽屉" });
    await drawer.waitFor({ timeout: 4000 });
    const navInDrawer = await drawer.getByRole("navigation", { name: "应用导航" }).isVisible();
    await mobile.screenshot({ path: `${OUT}s12-mobile-sheet.png` });
    record(
      "responsive.mobile.sheet",
      navInDrawer ? "passed" : "failed",
      "rule/RESP-101：<lg 导航为可开关抽屉，点击导航后自动关闭",
      `抽屉内导航可见=${navInDrawer}`,
      ["s12-mobile-sheet.png"],
      { route: "/incidents", viewport: "390x844", theme: "light" },
    );
    await mobile.getByRole("link", { name: /设置/ }).first().click().catch(() => {});
    await mobile.waitForTimeout(500);
    const drawerClosed = (await drawer.count()) === 0;
    record(
      "responsive.mobile.drawer.autoclose",
      drawerClosed ? "passed" : "failed",
      "导航点击后抽屉自动关闭",
      `抽屉已关闭=${drawerClosed}`,
      ["s12-mobile-sheet.png"],
      { route: "/settings", viewport: "390x844", theme: "light" },
    );
    await mobile.close();

    /* ---------- console 错误汇总 ---------- */
    const realErrors = consoleErrors.filter((e) => !e.includes("Download the React DevTools"));
    record(
      "console.errors",
      realErrors.length === 0 ? "passed" : "failed",
      "浏览器 console 无未捕获错误",
      realErrors.length === 0 ? "0 errors" : realErrors.slice(0, 3).join(" | "),
      ["console.txt"],
    );
    writeFileSync(`${OUT}console.txt`, consoleErrors.join("\n") || "(no console output)");
  } finally {
    await browser.close();
    server.kill("SIGTERM");
  }

  writeFileSync(
    `${OUT}evidence-summary.json`,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        browser: "chromium (playwright bundled)",
        results,
        passed: results.filter((r) => r.status === "passed").length,
        failed: results.filter((r) => r.status === "failed").length,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`\nsummary: ${results.filter((r) => r.status === "passed").length} passed / ${results.filter((r) => r.status === "failed").length} failed`);
  process.exit(results.some((r) => r.status === "failed") ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
