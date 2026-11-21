# Result — 20261120-231718-quiet-inset-sidebar-fidelity

## 交付

按 proposal 全部落地：F-2 推翻重定案（`--sidebar-active-weight` / `--sidebar-group-weight`
400 → 500）、侧栏行高 token 化（`--sidebar-row-height` 默认 2rem，quiet-inset 置 28px）、
普通项文字色 token 化（`--sidebar-item-foreground`，light oklch(0.378 0.013 284) / dark
oklch(0.7 0.004 284)，默认回退 `--sidebar-foreground`）、共享库 `ui/sidebar` MenuButton
读上述 var、密度注释纠正、quiet-inset 0.5.0 / workbench-shell 5.0.10、catalog/registry 重生成。

## 验证输出

- `validate_package.py package templates/quiet-inset` → 0 error / 0 warning
- `validate_package.py package templates/workbench-shell` → 0 error / 0 warning
- `make check` → **Ran 47 tests … OK (skipped=1)**（唯一 skip 为需 `UI_TEMPLATE_ESLINT_DIR`
  的 lint 规则测试，与本次改动无关的历史原因）
- 环境补记：本机此前从未装过 python playwright 包（历史 skip=11 的真实原因之一）；
  本次 `pip install playwright` 后用缓存 chromium-1254（symlink 为 1255）实跑 CheckRendered
  10 用例全过，渲染检查首次在本机跑绿。

## 状态

未 commit，未 push（写入本 result 后即执行）。

## 关键决定

- 0.4.0 F-2 的「侧栏 400」判定作废：导出 picks 抓的是容器元素（继承 body 16px/400），
  内部文字 span 实为 13px/500（普通与选中同）。已写回 theme.css 头注释与 CHANGELOG。
- 行高与普通项色均走 token 化而非改死共享类，默认值保持 workbench-shell 现状（multica
  实测 32px 行高、近黑项色）——与 0.4.1 的字重 token 化方法论一致。
- 分组标题色 `/70` alpha 机制保持（有效灰 ~0.53 vs 参照 0.378，记入已知偏差）。
