# ui-templates-skill

`ui-templates-skill` 是一套双 public skill 产品：

- **`ui-template`**：从获授权的 Web、代码仓库、图片或设计文档提取设计规则，创建、迁移、更新 schema v2 模板并维护索引。
- **`ui-template-apply`**：消费已验证模板，按 Phase 0–9 在目标项目实现 UI，维护 checkpoint、current-build 浏览器证据、review 与 feedback。

完整能力必须同时安装两个 skill。仓库内 `.agents/skills/ui-template-manager/` 只是项目级路由薄封装，不进入公开 bundle。

## 模板契约

schema v2 模板以 `spec.md`、`tokens.yaml`、`meta.yaml`、`evidence.yaml` 为必备文件，可包含拆分设计文档、可选 `fidelity.yaml` 和技术栈无关的 `apply/`。`tokens.yaml` 是精确值唯一载体；origin 只允许 `source | computed | estimated | default`。模板不包含 `implementation/`、stack adapter、消费项目目录、API/mock/data 分层或 runnable starter。无 sidecar 的合法 v2 模板按 baseline fidelity 消费，layout 不得为 high。structural 导入需要 chrome-complete literal graph。

格式语义以 [`skills/ui-template/references/spec-format.md`](skills/ui-template/references/spec-format.md) 为准，机器结构以 [`schemas/template/v2/`](schemas/template/v2/) 为准，可选结构保真 sidecar 以 [`schemas/template/fidelity/v1/`](schemas/template/fidelity/v1/) 为准。当前模板库见 [`templates/INDEX.md`](templates/INDEX.md)；`workbench-shell` 来源同时包含固定 revision 的公开仓库源码和一份已泛化的用户设计文档。无本会话 source 时 workbench 保持 `legacy-baseline`，`confidence.layout` 不高于 medium，不索取上游本地路径。双 skill 必须配套升级；未知 profile 不静默降级。`example/**` 是治理排除项。

## 安装与升级 2.0.0 bundle

先创建固定依赖环境，再构建可复现 bundle：

```bash
make bootstrap
make bundle
```

产物为 `dist/ui-templates-skill-2.0.0.tar.gz`、SHA-256 sidecar 和 bundle 内 `skills-manifest.yaml`。安装到项目的 skills **父目录**：

```bash
ARTIFACT=dist/ui-templates-skill-2.0.0.tar.gz \
INSTALL_TARGET=/path/to/project/.agents/skills \
make install
```

同一命令用于升级：安装器先验证 checksum/manifest，在目标父目录 staging，只原子替换 `ui-template` 与 `ui-template-apply`，清理已删除的受管生产文件，并保留其他 skills 以及单独管理的 `patches/`、`experience/`。不要用旧的单目录 `cp -r` 安装。

## 验证、评估与镜像

```bash
make validate       # root governance gate；显式排除 web-v2/web-v3 样例路径
make test           # 全部 Python unittest
make eval           # 当前 26 个 Authoring/Apply contract eval，输出 JSON/JUnit
make mirror-check   # 检查 .agents/skills 中双 public skill 生产镜像
make mirror-write   # 以 allowlist 原子重建受管镜像，不触碰其他 skills
```

单独验证模板：

```bash
/tmp/ui-template-governance-venv/bin/python scripts/validate_templates.py templates --json
```

`make validate` 不运行任何样例项目，也不把样例质量作为治理通过条件；排除项会写入机器报告。

## v1 迁移与回滚

v2 消费者不会静默读取 v1。迁移只生成候选目录和报告，不覆盖来源：

```bash
/tmp/ui-template-governance-venv/bin/python scripts/migrate_template.py SOURCE CANDIDATE
```

按 [`governance/release/MIGRATION-v1-to-v2.md`](governance/release/MIGRATION-v1-to-v2.md) 解决 `unresolved` 后再验证和替换。升级失败由安装器自动恢复原双 skill；主动回滚时，用同一 `make install` 命令安装先前已验证的 artifact/checksum，详见 [`governance/release/ROLLBACK.md`](governance/release/ROLLBACK.md)。版本兼容矩阵见 [`governance/release/compatibility.yaml`](governance/release/compatibility.yaml)，变更记录见 [`governance/release/CHANGELOG.md`](governance/release/CHANGELOG.md)。

## 样例 promotion

样例默认是 WIP，不进入发布能力声明。独立 promotion CLI 只校验 tracked revision、声明的 frozen install/build/static/test/multi-viewport/feedback/localization gates 及证据；它默认不执行样例命令，也不改 README、bundle 或样例目录。被 [`governance/scope.yaml`](governance/scope.yaml) 排除的样例不能 promotion。

## 许可证

MIT，见 [LICENSE](LICENSE)。
