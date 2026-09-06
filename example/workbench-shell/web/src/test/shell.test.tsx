import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { App } from "@/App";
import { routes } from "@/routes";

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([{ path: "/", element: <App />, children: routes }], {
    initialEntries: [path],
  });
  return render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe("app shell", () => {
  it("事件页渲染 PageHeader 与表格", async () => {
    renderAt("/incidents");
    expect(await screen.findByRole("heading", { name: "事件" })).toBeInTheDocument();
    expect(await screen.findByText("INC-1001")).toBeInTheDocument();
  });

  it("设置页渲染 C 模式 tablist", async () => {
    renderAt("/settings?tab=appearance");
    expect(screen.getByRole("tablist", { name: "设置分区" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "外观", selected: true })).toBeInTheDocument();
  });

  it("未知路由渲染 404 空态", async () => {
    renderAt("/nowhere");
    expect(await screen.findByText("页面不存在")).toBeInTheDocument();
  });
});
