## Context

见 `proposal.md` 的 Why。当前约束：`npx skills` 只复制含 `SKILL.md` 的 skill 目录；本仓 `skills/` 与 `.agents/skills/` 都会被发现；仓库根 `templates/` 是生产库真相源，但不在 skill 目录内；`manage_template_index.py` 默认 `ROOT` 是 Author skill 根下的 `templates/`，安装后既没有官方模板，也容易把 skill 目录误当成可写库。

## Goals / Non-Goals

**Goals**

- 空项目成对安装两个公开 skill 后，Apply 能读到 `workbench-shell`。
- 官方模板随 Author skill 走；用户库留在项目 `templates/`。
- `npx skills add . --list` 默认只露出两个公开 skill。
- catalog 与仓库根生产库由治理保持同一 published 集合。

**Non-Goals**

- 不改 `workbench-shell` 视觉/token 内容，不重抽 fidelity。
- 不把 `ui-template-manager` 做成第三个公开 skill。
- 不把 `npx skills` 做成 checksum 安装器；治理 tarball 仍负责回滚。
- 不自动提交 skills.sh，不爬第三方 registry。
- 不覆盖用户已有项目模板。

## Decisions

1. **Catalog 路径用 `skills/ui-template-author/catalog/`，不用 skill 内 `templates/`。**  
   skill 根 `templates/` 会与 `manage_template_index.py` 默认 ROOT 撞车，升级还会被安装器整目录替换。`catalog/` 明确只读；项目库永远是消费项目根下的 `templates/`。  
   备选：把官方库放进 Apply skill — 拒绝，模板所有权在 Authoring。  
   备选：安装器再写一份项目 `templates/` — `npx skills` 不会跑我们的 installer。

2. **仓库根 `templates/` 仍是本仓真相源；catalog 是生成副本。**  
   改官方模板只改 `templates/`，再跑同步（并入 `mirror-write` 或独立 `catalog-sync`，由 `validate`/`mirror-check` 断言零漂移）。禁止手改 catalog 当第二真相。  
   备选：只保留 catalog、删根 `templates/` — 拒绝，本仓 Authoring/治理命令与 INDEX 契约都指向根 `templates/`。

3. **播种是“缺则拷，有则停”，不是 merge。**  
   项目没有同名目录且 INDEX 没有同名行时，把 catalog 中该 published 模板整目录拷进项目并追加 INDEX 行。已有行或目录一律不覆盖；retired 项目行不得被 catalog 救回。显式 refresh 不在本 change 交付，只留冲突报告。  
   备选：Apply 直接读 catalog、不播种 — 拒绝，现有 validator/`require-published`/feedback 都假设项目 `templates/`。

4. **Apply 找 catalog：已安装 Author skill 的兄弟目录。**  
   解析顺序：显式 `--catalog` / 用户给出的 Author 路径 → 与 Apply 同级的 `ui-template-author/catalog/` → 失败则“没有模板”。不扫描任意 `PATH`、不 clone 本仓、不读 `example/**`。  
   本仓库开发时根 `templates/` 已存在，播种是 no-op。

5. **对外入口是带两个 `-s` 的 `npx skills add`。**  
   发现面靠 `metadata.internal: true` 藏 manager 与本仓 OpenSpec skill；文档禁止 `--all`。治理 `make bundle` 继续打包同一 `skills/` 树（含 catalog），给 checksum/回滚用。  
   备选：拆两个独立 GitHub 仓 — 拒绝，成对约束会断。  
   备选：只改 README、不藏内部 skill — 拒绝，交互安装仍会列出 7 个。

6. **默认 CLI 根改为消费项目，不再默默指向 skill 根。**  
   `manage_template_index.py` 与 Apply Intake 在未传 `--index` 时使用消费项目 `templates/INDEX.md`；catalog 只作播种源。避免安装后把只读 catalog 当成可写库。

7. **版本按兼容增加处理。**  
   对外多带文件、解析多一条回退，不破坏 schema v2。发布记为 2.x 兼容版本（建议 2.1.0），不是 3.0.0。catalog 模板自身 `template_version` 不因搬家而涨。

## Risks / Trade-offs

- [catalog 与根 `templates/` 双份] → 只允许生成同步；drift 阻断发布。
- [播种拷贝变大] → 只拷 published；当前只有 `workbench-shell`，可接受。
- [用户改过官方模板后又升级 skill] → 不覆盖项目行；catalog 更新不会自动进项目。文档写明“项目库优先”。
- [`metadata.internal` 依赖 CLI 行为] → 用 `npx skills add . --list` 做治理断言；CLI 若忽略该字段则测试失败。
- [workbench 再分发许可] → 进 catalog 前核对 `evidence.yaml` 许可/再分发/脱敏；缺字段先补再发布，不改设计值。

## Migration Plan

1. 同步 catalog ← 根 `templates/` published 集合。
2. 更新 allowlist、镜像、README/`npx skills` 命令、internal 标记。
3. 改路径解析与播种；加 eval：空项目安装后能 `require-published workbench-shell`。
4. 回滚：安装上一份不含 catalog 的 2.0.0 artifact 或旧 skill 目录；项目里已播种的 `templates/` 保留（用户数据）。新文档入口失效时改回旧 README 命令即可。

## Open Questions

无。技能商店收录阈值与 badge 可在首次对外 `npx skills add` 之后再补，不影响本 change 契约。
