# 03 骨架

按 `patterns/shell.md` 写 `main.tsx`（providers）和根路由（AppShell + Outlet），再挂上 `RouteError` / `NotFound`。
此时先放每个页面的空壳：`<Page title=…>…</Page>`，确认导航、主题切换、
窄屏 sheet 都正常，再进入 04。

路由不是 react-router？只改 `src/components/blocks/router.tsx` 的导出实现（AppLink、useAppNavigate、
useUrlState、useAppPathname、useIsActive），其他文件不动。
