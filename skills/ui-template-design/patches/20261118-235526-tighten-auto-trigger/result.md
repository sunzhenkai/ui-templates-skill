# Result

- target: skills/ui-template-design
- mode: update
- patch: 20261118-235526-tighten-auto-trigger
- risk: high
- status: applied
- applied-at: 2026-11-18T23:57:40+08:00

## Validation

- `git apply --check --recount`: pass
- `git diff --check`: pass
- target tests: `make check` passed，46 tests，1 skipped（未设置 `UI_TEMPLATE_ESLINT_DIR`）；四份 frontmatter 解析检查通过
- privacy check: pass
- mode check: pass

## Notes

静态路由案例符合预期：ui-template 品牌深色主题触发；普通 shadcn 项目换色不触发；页面实现和来源提炼分别路由到 apply、author。未执行独立模型自动触发实验。
