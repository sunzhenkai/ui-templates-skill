# Proposal — 把两次保真校准的教训变成常设闸门

## Intent

quiet-inset 0.5.x/0.6.x 两轮校准暴露了两类「文档声明了、代码没兑现」的系统性缺口，靠人工审计才发现。
本 patch 把它们变成 `validate_package.py package` 的常设检查，并修掉 macOS 上 fidelity 必超时的平台坑。

## 四项落地

1. **P12 density 声明一致性**：meta.yaml density 注释里的具体数值声明（`controls 28px`、`sidebar rows 28px`）
   必须与 theme token（`--control-height` / `--sidebar-row-height`）或 library 默认值一致，且 library
   必须有组件实际读取该 token。反向测试：quiet-inset theme 改 32px → 正确报
   「declares controls 28px but --control-height resolves to 32px」。
2. **P13 浮层阴影接线**：`dropdown-menu / select / popover / command` 必须用 `shadow-lg`
   （→ `--floating-shadow`），出现 `shadow-md` 或缺失即警告。反向测试：popover 改 shadow-md → 正确报。
3. **fidelity webServer `--host 127.0.0.1`**：vite preview 默认绑 localhost（macOS 上是 ::1），
   Playwright 探 127.0.0.1 会 60s 超时——每次 Mac 上跑保真都要手搓临时 config，此改根治。
4. **反向验证作为闸门验收标准**：新增检查必须用它构造一次违规证明会报警，避免死代码。

## Conflict check

- 只加 warning 级检查（不阻断既有包），两包当前 0 warning 通过。
- 修改 `library/fidelity/playwright.fidelity.config.ts` 是共享文件，但只影响开发期保真工具链，
  不改运行时代码——按惯例随 patch 升 catalog/registry 即可，包版本不递进（无消费端行为变化）。
- 闸门代码位于 ui-template-apply scripts，不进入 catalog。

## Files

- `skills/ui-template-apply/scripts/validate_package.py`（+2 检查函数、cmd_package 挂钩）
- `skills/ui-template-apply/library/fidelity/playwright.fidelity.config.ts`（--host）
- catalog/registry 由 `make sync` 重生成（fidelity 文件哈希变化）

## Validation

- validate_package ×2 → 0 error / 0 warning（新闸门不误报）
- 反向测试两项（P12/P13 各构造一次违规，正确报警后还原）
- make check → 48 tests OK（skip=1 为历史 lint 依赖）
