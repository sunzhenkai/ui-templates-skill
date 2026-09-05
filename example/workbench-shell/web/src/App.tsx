import { useEffect } from "react";
import { isRouteErrorResponse, Outlet, useRouteError } from "react-router";
import { AppShell } from "@/components/shell/app-shell";
import { NavigationProgress } from "@/components/shell/nav-progress";
import { Toaster } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { usePrefs } from "@/stores/prefs";

export function App() {
  const theme = usePrefs((s) => s.theme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <AppShell>
      <Outlet />
      <NavigationProgress />
      <Toaster />
    </AppShell>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const is404 = isRouteErrorResponse(error) && error.status === 404;
  return (
    <div role="alert" className="flex h-full flex-col items-center justify-center gap-2 bg-page-canvas p-6 text-center">
      <p className="font-mono text-display text-faint-foreground">{is404 ? "404" : "500"}</p>
      <h1 className="text-title-lg font-semibold">{is404 ? "页面不存在" : "出错了"}</h1>
      <p className="max-w-sm text-caption text-muted-foreground">
        {is404 ? "你访问的页面不存在或已被移动。" : "发生了意外错误，请重试。"}
      </p>
      <Button variant="outline" onClick={() => (window.location.href = "/")}>
        返回首页
      </Button>
    </div>
  );
}
