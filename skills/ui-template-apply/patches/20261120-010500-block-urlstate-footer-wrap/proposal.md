# block 两处共性缺陷：URL 参数合并写回、页脚窄屏换行

- target: skills/ui-template-apply
- mode: update
- patch: 20261120-010500-block-urlstate-footer-wrap
- risk: low
- status: proposed

## Intent

一个真实项目迁移到 quiet-inset 时撞到两处 `library/blocks` 缺陷，都属于所有消费方会重复踩的共性问题，修在库里而不是项目里。

1. `blocks/router` 的 `useUrlState`：同一事件里改多个参数（「清除筛选」一次清六项）只剩最后一项。React Router 对每次 `setSearchParams` 的函数式更新都基于同一个 location 快照，并发调用互相覆盖。
2. `blocks/data-table` 页脚：窄容器下页脚不换行，直接把「每页」和它的选择器拆成上下两行。

## Conflict check

- `useUrlState` 的对外签名与语义（空值/默认值从 URL 移除、`replace: true`）不变，只改写入时机；单参数调用仍在同一微任务内落地，调用方无感。
- 模块级 `pendingSearch` 只在浏览器端存在；`window.location.search` 在两次刷新之间是真实来源，SSR 下该 block 本来就不渲染。
- 页脚只增加换行能力与 `shrink-0` / `whitespace-nowrap`，1280/768 宽度下的既有布局不变。
- 版本号：quiet-inset 0.1.0 → 0.2.0、workbench-shell 5.0.5 → 5.0.6，两包共用 blocks 库，都要能拿到修复。

## Rationale

修在库里，消费项目的 `local_edits` 就能删掉，`ui-review.md` 里这两条按受锁缺陷流程写 `upstream: 0.2.0` 关闭，而不是每个项目各自 fork 一份页脚。

## Files

- skills/ui-template-apply/library/blocks/router.tsx
- skills/ui-template-apply/library/blocks/data-table.tsx
- templates/quiet-inset/meta.yaml、templates/quiet-inset/CHANGELOG.md
- templates/workbench-shell/meta.yaml、templates/workbench-shell/CHANGELOG.md
- CHANGELOG.md
- skills/ui-template-apply/library/registry.json、skills/ui-template-apply/catalog/**（`make sync` 派生物）

## Validation

- 应用前：`git apply --check --recount`
- `make sync` 后 `make check`：47 tests OK（skipped=1），`names` / `registry --check` / `catalog --check` 全过
- 消费方实证：迁移项目重锁到 quiet-inset 0.2.0 后，`清除筛选` 仍恢复到全量行、390 宽页脚单行
