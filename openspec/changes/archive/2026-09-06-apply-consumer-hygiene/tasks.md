## 1. INDEX resolve 与默认不播种

- [x] 1.1 改 `scripts/manage_template_index.py`：`require-published` 默认不播种（等价 `--no-seed`）；新增 `resolve` 输出 origin/path/name/version/digest/status
- [x] 1.2 同步 Author runtime 副本 `skills/ui-template-author/runtime/manage_template_index.py`，行为与 scripts 一致
- [x] 1.3 补 unittest：空项目 resolve catalog 不创建 `templates/`；项目 published 优先；retired 拒绝且不覆盖；显式 `seed` 仍只拷指定名称

## 2. Apply pin、选型与 closed 提示

- [x] 2.1 checkpoint schema 增加可选 `template.origin`（`catalog | project`）与 `resolved_path`；缺省兼容旧文件
- [x] 2.2 定义 Phase 0 `00-architecture.yaml` 字段与 greenfield/existing 探测；未确认阻塞 Phase 1+ 与应用写盘
- [x] 2.3 更新 Apply SKILL / `apply-workflow.md` / `fidelity-compare.md` / `toolchain.md`：Intake 用 resolve+pin，不播种；Phase 3 只消费已确认架构；`project-init` 仅确认后可选执行
- [x] 2.4 收尾汇报增加可检索 closed 字段或固定句子：可删 `.ui-template-apply/`、未领养则不应有 `templates/`；不自动删除。可选 `apply-close` 只检查并打印
- [x] 2.5 更新 state checker / eval judges，使 catalog pin 与 architecture artifact 可校验

## 3. Authoring 写时领养

- [x] 3.1 Authoring 库动词（update / feedback 落库 / retire / 显式 seed /「接到本仓」）在项目无同名行且无目录时领养 catalog，已有则不覆盖
- [x] 3.2 更新 Author SKILL / `template-lifecycle.md` / `feedback-lifecycle.md`：Apply 不播种；领养必须写进 Report；用户拒绝则 feedback 保持 proposed
- [x] 3.3 更新 `workbench-shell` `apply/playbook.md` Phase 0：去掉播种完成条件，不改 token/规则值

## 4. 派生文档与版本

- [x] 4.1 改写 `governance/FUNCTIONAL-LOOP.md` I3 与移交段：库宿主 INDEX vs 消费 pin；closed 提示
- [x] 4.2 更新 README / AGENTS.md：空项目 Apply 不创建 `templates/`；seed 是显式领养
- [x] 4.3 按兼容策略升到 2.2.0（VERSION / CHANGELOG / compatibility）；模板 `template_version` 不因本 change 上涨

## 5. 契约测试与门禁

- [x] 5.1 增加 eval：空仓 Apply `workbench-shell` 能 Intake 且不创建 `templates/`
- [x] 5.2 增加 eval：greenfield 未确认不得出现依赖清单；用户点名栈不得被改成另一套默认；existing 不跑选型
- [x] 5.3 增加 eval：Phase 9 closed 且无 proposed 时汇报含可删 `.ui-template-apply/`；未 closed 不得宣称可删
- [x] 5.4 增加 eval：显式 seed/领养后项目库可 portable 校验；retired 仍拒绝
- [x] 5.5 跑 `make test`、`make eval`、`make validate`、`make mirror-write`、`make mirror-check`；不 archive、不 publish、不 promote 样例
