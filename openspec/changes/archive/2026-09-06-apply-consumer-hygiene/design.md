## Context

见 `proposal.md` 的 Why。现行约束：`require-published` 默认 `ensure_published` 会把 catalog 拷进消费项目 `templates/`；`ship-npx-skill-catalog` 曾拒绝「Apply 直接读 catalog」，因为当时 validator / feedback 都假设项目库。Phase 0 只记录技术栈，没有 greenfield 门禁。`.ui-template-apply/` 是完成证据根，但收尾没有处置说明。checkpoint 固定 0–9，不能加第 10 阶段。模板仍禁止 `implementation/` 与 stack adapter。

## Goals / Non-Goals

**Goals:**

- 解析顺序可执行：项目 published → 拒绝 retired → catalog pin → 失败移交。
- 写路径与读路径分离：领养/seed 只在 Authoring 写动词或用户显式接到本仓时发生。
- greenfield 探测与闭集层列表稳定，确认前零应用写盘。
- closed 判定可机器检查（Phase 9 complete + inbox 无 proposed），汇报文案可 eval。

**Non-Goals:**

- 不自动删除磁盘上的 `.ui-template-apply/` 或已有 `templates/`。
- 不强制把 `.ui-template-apply/` 写入 `.gitignore`。
- 不把 `project-init` 做成 Apply 唯一脚手架，不规定 React/Vite/Tailwind 为默认栈。
- 不改官方模板视觉/token，不把 catalog 做成可写库。

## Decisions

1. **Apply 默认 resolve，不再 seed。**  
   `require-published` 默认等价 `--no-seed`；新增/暴露 `resolve` 返回 `{origin, path, name, version, digest, status}`。catalog 路径仍按已安装 Author 兄弟目录解析。  
   备选：保留默认播种、加 opt-out — 拒绝，空仓污染是本 change 要去掉的行为。  
   备选：checkpoint 只记 digest、运行时每次重读 catalog — 拒绝，跨会话恢复需要稳定 pin 与 `resolved_path`。

2. **写时领养，缺则拷、有则停。**  
   Authoring 的 update / feedback 落库 / retire / 显式 seed /「接到本仓」在项目无同名行且无目录时 `copytree` catalog → `templates/<name>/` 并写 INDEX。已有行或目录不覆盖；retired 不救回。  
   这推翻 `ship-npx-skill-catalog` D3 对 Apply 的部分：validator/feedback 改为「有项目库才校验项目 INDEX；否则校验 pin 指向的 catalog 目录」。  
   备选：feedback 直接改进 catalog — 拒绝，catalog 随 skill 升级替换。

3. **checkpoint 增加可选 `template.origin` 与 `resolved_path`。**  
   `origin` 闭集 `catalog | project`。缺省：存在项目 INDEX 行则 `project`，否则 `catalog`。`resolved_path` 为安全相对路径或 skill 内 catalog 相对定位，不得写历史绝对路径。digest 算法不变。架构 artifact 登记在 Phase 0 `artifacts[]`，不新增 checkpoint 顶层必填字段，避免把旧 checkpoint 一次性判死刑。

4. **greenfield 选型是 Phase 0 gate，不是新 phase。**  
   产物 `.ui-template-apply/00-architecture.yaml`：`site`、闭集层、`confirmed_by_user`、拟用 init 命令、`build_identity` 预声明。闭集层：language/runtime、UI framework（或 none）、bundler/dev、routing、styling、client/server state、data access、unit + browser 验证、package manager、repo shape。  
   `project-init` 仅当用户明确要脚手架且所选栈落在其 reference 时作为确认后执行器；否则用该栈官方 create CLI，或用户同意后的最小可运行壳。  
   备选：把选型并进 Phase 3 — 拒绝，Phase 1 token map 已依赖 styling 层。  
   备选：handoff 到 openspec-explore — 拒绝，Apply 需要可 eval 的闭集 artifact。

5. **closed 只提示，不删除。**  
   Phase 9 complete 且 feedback inbox 无 `proposed` → 会话 `closed`。最终汇报 MUST 含固定可检索句子（或 JSON 字段 `session_closed: true` + `may_delete_apply_root: true`）。可选 `apply-close` 子命令只做检查并打印提示，不删文件。  
   备选：closed 后自动 rm — 拒绝，证据和未读 feedback 可能还要给人看。  
   备选：强制 gitignore — 拒绝，有的团队要把账本入库审计。

6. **I3 改写为双角色。**  
   库宿主（本仓或已领养项目）：INDEX 仍是唯一可写目录。消费仓：Apply 可以只靠 catalog pin 完成 Phase 0–9。项目 retired 仍优先于 catalog。`FUNCTIONAL-LOOP.md` 与 README 随 spec 改，不另开 capability。

7. **版本 2.2.0 兼容。**  
   少写消费仓文件，模板 `template_version` 不因本 change 上涨。本仓根 `templates/` 开发时已存在，resolve 走 `origin=project`，行为接近今天。

## Risks / Trade-offs

- [已播种仓与新仓行为分叉] → 文档写明项目库优先；eval 覆盖空仓不落库、已有库不覆盖、retired 拒绝。
- [feedback 时才突然出现 templates/] → Authoring Report 必须写清「本次领养」；用户拒绝领养则 feedback 保持 proposed，不得假称已改模板。
- [Agent 仍偷偷开 React 栈] → eval：greenfield 未确认不得出现依赖清单；用户点名 Vue 不得改成 React。
- [用户误删未 closed 的账本] → 恢复规则不变：无 checkpoint 则新 Intake；汇报只在 closed 后说可删。
- [catalog 升级后 pin digest 过期] → 恢复时 identity 不一致从 Phase 0 重开；不自动改项目文件。

## Migration Plan

1. 改 INDEX CLI 与 Apply Intake，默认不播种；补 unittest / eval。
2. 加 architecture artifact 与 closed 汇报字段；改 skill 正文与 workbench playbook 措辞。
3. Authoring 写动词接入领养；FUNCTIONAL-LOOP I3 / README 同步。
4. `make test` / `make eval` / `make validate` / `make mirror-write`。
5. 发布记 2.2.0。回滚：安装 2.1.x skill；已 pin 的消费仓没有 `templates/` 属预期，已领养库保留。

## Open Questions

无。closed 提示的具体文案在实现时写入 Apply 汇报模板，eval 匹配稳定字段或关键字即可，不改变本 design 的「提示不删除」。
