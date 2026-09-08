## Why

统一 `ui-template-author`、`ui-template-design` 与 `ui-template-apply` 的 Design System 契约：以统一 Design System Contract 为唯一语义真相，分离 portable core 与 project binding；Apply 按项目 active Design System 实施初始化与增量更新，并按技术栈条件引入 vendor 参考规则。

## What Changes

- 本 change 是 taskflow driver，不直接改代码，只编排子 change。

## Non-goals

- 不自动发布、tag 或归档子 change。
- 不把生成物、样例 `example/**` 或历史 `web*` 当作修复面。
- 不在统一契约中引入 stack adapter、依赖清单或 runnable starter。

## 涉及面

| 仓库 | 角色 | 说明 |
|------|------|------|
| . | 必须 | 会修改生产 skill、schema、validator、eval、governance 与派生文档；实施前切任务分支 |

## 验收标准

- [x] 统一 Design System Contract、portable core / project binding 边界和 active truth 优先级有机器可验证契约。
- [x] Author、Design、Apply 的移交与消费协议按统一契约更新。
- [x] Apply 支持初始化与增量更新场景，且未声明变更保持原字节。
- [x] vendor 参考有固定来源、license、allowlist 与条件加载规则。
- [x] 相关 schema、validator、contract eval、governance 和派生文档同步。

## Driver 协议

- 本 change 无 spec 增量（`.openspec.yaml` 已设 `skip_specs: true`）
- 子 change 一律命名 `unify-design-system-<slice>`，与本 change 同一 planning root；跨 root 时在涉及面表显式记录 root 或 store id
- 实现进度只认子 change 自己的 `tasks.md`；本文件的 checkbox 只在对应子 change 全勾且 `validate --strict` 通过后才勾
- 涉及面里角色为 `必须` 的仓在实施前切任务分支：没有则 `git switch -c`，已有则 `git switch`。不许 stash / reset / 强制切换。工作树 dirty 时：未提交路径仅含当前 task 的 OpenSpec change（`openspec/changes/unify-design-system-*`）则直接切；否则列出路径并确认是否继续 checkout。用户不同意、git 拒绝或切错仓时停下
- 只有「checkbox 全勾」「需要用户决策」「本轮预算耗尽」三种情况允许结束一轮；单项做不了就保持未勾，在验证记录写一行原因后继续下一项
- 结束时逐条列出未勾项与原因，不按 change 汇总

## 验证记录

- 2026-09-08：propose 阶段收口 D1–D32，创建 driver `design.md`/`tasks.md`，并一次性备齐五个子 change 的 proposal、specs、design、tasks；均通过 `openspec validate --strict`。尚未开始实现。
- 2026-09-08：完成 `unify-design-system-schema` 15/15 tasks；`make validate`、`make test`、`make eval` 与 change strict validation 通过。driver 2.1 已回填。
- 2026-09-08：完成 `unify-design-system-author` 14/14 tasks；`make validate`、`make test`、`make eval` 与 change strict validation 通过。driver 2.2 已回填。
- 2026-09-08：完成 `unify-design-system-design` 15/15 tasks；`make validate`、`make test`、`make eval` 与 change strict validation 通过。driver 2.3 已回填。
- 2026-09-08：完成 `unify-design-system-apply` 15/15 tasks；`make validate`、`make test`、`make eval` 与 change strict validation 通过。driver 2.4 已回填。
- 2026-09-08：release 子 change 已生成 workbench-shell design-system/v1 candidate；package+migration validator 通过，四类 fixture eval 通过。生产模板/catalog 切换等待用户单独确认；干净 bootstrap/increment 浏览器重生尚未执行。
- 2026-09-08：完成 release 3.2 vendor bundle allowlist；`make bundle` 两次 checksum 均为 `19c77b08042980dbd588d26d9e0c44e8fed8345ec9028a988404687ab0d0ff15`，165 files。完成 bootstrap/increment current-build browser evidence，均通过 active validator；证据在 release change `evidence/`。
- 2026-09-08：准备 release payload：bundle/skill 3.0.0 兼容矩阵、contract family、migration 与 rollback 草案已在 release change `release-payload/` 冻结；等待生产切换确认后才复制到 governance。
- 2026-09-08：完成 promotion dry-run：staged package/migration、INDEX、catalog identity、compatibility 3.0.0 与 vendor allowlist 全部通过；production before-fingerprint 已记录，继续等待用户单独确认切换。
- 2026-09-08：production promotion 完成；`make bootstrap`、`make validate`、`make test`、`make eval`、两次 `make bundle` 与 `openspec validate --all --strict` 全部通过。bundle 3.0.0 双构建 checksum 为 `f19844b551b1dfb980b41782a343e60ffabbb027a82e0be87c6e96910f68f4e1`，166 files。
