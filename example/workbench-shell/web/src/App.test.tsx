import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import { routes, queryClient } from "./App";

function renderApp(route = "/incidents") {
  const router = createMemoryRouter(routes, { initialEntries: [route] });
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe("workbench-shell web", () => {
  it("事件列表：加载数据并渲染表格行（mock 数据）", async () => {
    renderApp("/incidents");
    expect(await screen.findByRole("table", {}, { timeout: 4000 })).toBeInTheDocument();
    expect((await screen.findAllByText("网关 5xx 激增", {}, { timeout: 4000 })).length).toBeGreaterThan(0);
  });

  it("创建事件：必填校验阻止无效提交", async () => {
    const user = userEvent.setup();
    renderApp("/incidents");
    const open = await screen.findByRole("button", { name: /新建事件/ }, { timeout: 4000 });
    await user.click(open);
    const dialog = await screen.findByRole("dialog", { name: "创建事件" });
    expect(dialog).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "提交" }));
    expect(await screen.findByText("标题必填")).toBeInTheDocument();
  }, 15_000);
});
