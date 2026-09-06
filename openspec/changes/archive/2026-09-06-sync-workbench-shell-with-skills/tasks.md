## 1. 冻结变更集合

- [x] 1.1 以当前 `templates/workbench-shell/` 为 before，按 design D7 列出 `--allow` 路径
- [x] 1.2 确认无 session source：不写 `fidelity.yaml`，不改 `tokens.yaml` value，不索取 source-001/source-002 路径

## 2. 对齐生产模板正文

- [x] 2.1 在 `routes-and-layouts.md` 与 `platforms/web.md` 增加 expanded/collapsed/overlay ↔ 四态对照，并写明无 sidecar、不得标 profile-verified
- [x] 2.2 把 Web 断点触发与 Desktop `AX-070`/`LAYOUT-014` 用户开关拆开；`platforms/mobile.md` 写明不套用 Web 三态
- [x] 2.3 `apply/playbook.md` Phase 0 补 legacy-baseline / structural fidelity unavailable，并禁止把 `meta.sources[]` 当实现输入
- [x] 2.4 从模板 prose / `apply/` 去掉 1280/1024/288/48/16/768 字面量，改为现有 token path；不新增 rule ID
- [x] 2.5 `meta.yaml` 的 `template_version` 升到 2.0.1；`captured_at` 与 INDEX 前四列保持不变

## 3. 实例附录

- [x] 3.1 按 delta 改写将在 archive 后合入的行为：实现侧以生产模板为准，不在 apply 阶段改 `openspec/specs/` base
- [x] 3.2 扫描 `templates/workbench-shell/**` 与本 change 的实例 delta，确认验收 prose 不再把上述像素当规范字面量

## 4. 校验与 catalog 同步

- [x] 4.1 对 `templates/workbench-shell` 与 `templates/INDEX.md` 跑 portable validator，零 error
- [x] 4.2 用 `manage_template_index.py check-changeset` 证明只改了 D7 allow 路径
- [x] 4.3 `scripts/manage_skill_distribution.py catalog --write`，再 `make mirror-write` 与 `make mirror-check`
- [x] 4.4 确认 catalog 无 `fidelity.yaml`，且 `template_version` 与生产库同为 2.0.1

## 5. 治理记录与回归

- [x] 5.1 CHANGELOG Unreleased 记 `workbench-shell` 2.0.1 portable 对齐；进行中 Apply 需从 Phase 0 重开
- [x] 5.2 跑 `make test`、`make eval`、`make validate`；不 archive、不 publish、不改 `example/**`
