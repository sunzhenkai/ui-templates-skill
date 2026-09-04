# workbench-shell web-v1

交付与运维事件协作中心的前端样例，消费仓库内 `workbench-shell` schema v2 模板。数据全部为本地 mock，不连接真实后端。

## 启动

```bash
pnpm install
pnpm dev
```

开发服务器默认 http://localhost:5173 。刷新后恢复上次工作区与默认首页。

## 命令

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 开发服务器 |
| `pnpm build` | 类型检查 + 生产构建 |
| `pnpm test` | Vitest 单元/组件测试 |
| `pnpm exec playwright install` | 首次安装浏览器后再跑 E2E |
| `pnpm test:e2e` | Playwright smoke |
| `pnpm lint` | oxlint |

## 模拟失败

设置页「个人偏好」打开「模拟失败」，或 URL 加上 `?mockFail=1`，或在搜索/标题中使用 `__FAIL__`。

## 范围

本目录是消费样例，不属于治理校验输入。Apply 状态在 `.ui-template-apply/`。
