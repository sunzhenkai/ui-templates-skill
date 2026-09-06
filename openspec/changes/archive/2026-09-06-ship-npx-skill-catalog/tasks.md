## 1. Catalog 同步与许可

- [x] 1.1 核对 `templates/workbench-shell/evidence.yaml` 的许可/再分发/脱敏字段；缺则补元数据，不改 token/规则值
- [x] 1.2 增加 catalog 同步器：从仓库根 `templates/` 的 published 集合生成 `skills/ui-template-author/catalog/`（INDEX + 模板目录）
- [x] 1.3 将 catalog 同步纳入 `mirror-write`（或等价固定命令），`mirror-check`/`validate` 对根 `templates/` 与 catalog 做 published 集合与 digest 零漂移
- [x] 1.4 首次生成 catalog，确认含 published `workbench-shell` 必备文件与附件

## 2. 库路径与播种

- [x] 2.1 改 `manage_template_index.py`：未传 `--index`/`--templates` 时默认消费项目 `templates/`，不再默认写 Author skill 根
- [x] 2.2 增加 `seed`（或等价）动词：从 `--catalog` 或缺省兄弟目录 `ui-template-author/catalog/` 把缺失的 published 模板拷到项目库；已有同名行/目录不覆盖；retired 行不救回
- [x] 2.3 Apply Intake / Authoring 库解析按 design 顺序找 catalog；空项目缺目标行先播种再 `require-published`
- [x] 2.4 更新 Author/Apply skill 正文与 lifecycle/workflow：写清 catalog 只读、项目库可写、空项目不是“没有模板”

## 3. 公开发现面

- [x] 3.1 给 `.agents/skills/ui-template-manager` 与本仓 OpenSpec skill 加 `metadata.internal: true`
- [x] 3.2 增加治理断言：未设置 `INSTALL_INTERNAL_SKILLS` 时 `npx skills add . --list` 只含 `ui-template-author` 与 `ui-template-apply`

## 4. 分发 allowlist 与版本

- [x] 4.1 更新 `distribution-v1.yaml`：Author allowlist 含 `catalog/**`；缺 catalog 时 build 失败
- [x] 4.2 bundle/install smoke：产物含 catalog；空目标安装后能对播种结果跑 `require-published workbench-shell`
- [x] 4.3 按兼容策略升到 2.1.0（或现行 2.x 下一兼容版本），更新 VERSION/CHANGELOG/compatibility；`template_version` 不因搬家上涨

## 5. 文档入口

- [x] 5.1 README/AGENTS/`FUNCTIONAL-LOOP`：对外主入口改为成对 `npx skills add … -s ui-template-author -s ui-template-apply`；禁止把 `--all` 写成官方步骤
- [x] 5.2 保留 `make bundle`/`make install` 为治理与回滚通道，并说明 catalog 随 Author skill 安装
- [x] 5.3 同步生产 skill 与 manager 路由中的安装/库路径表述；不改 `example/**`

## 6. 契约测试与门禁

- [x] 6.1 增加 eval/unittest：catalog↔生产库 drift、播种不覆盖、retired 不救回、空项目安装后 Apply 能读 `workbench-shell`
- [x] 6.2 增加 eval：项目与 catalog 都没有目标模板时才报“没有模板”并移交 Authoring
- [x] 6.3 跑 `make test`、`make eval`、`make validate`、`make mirror-check`；不 archive、不 publish、不 promote 样例
