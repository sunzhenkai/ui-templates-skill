# 模板库生命周期

本文件定义 `ui-template-author` 对 `templates/` 的库动词。格式字段仍由 [spec-format.md](spec-format.md) 所有；从源采集仍由对应 `source-*.md` 所有。

## 状态

```text
draft → published → retired → deleted
```

- **draft**：staging 候选目录，**不是** INDEX 状态。未写入生产 INDEX 的目录才是 draft；不提供 unretire / split。
- **published**：INDEX 状态为 `published`，Apply 可新消费。
- **retired**：INDEX 状态为 `retired`，目录保留；Apply 新 Intake 必须停止。
- **deleted**：INDEX 行与 `templates/<name>/` 都已移除。

规则 ID 删除后永不复用。重名必须先问更新还是另建，不得覆盖。

## INDEX

生产 `templates/INDEX.md` 表头必须是：

```text
| 名称 | 风格描述 | 来源类型 | 采集日期 | 状态 |
```

状态闭集：`published` | `retired`。前四列必须与该模板 `meta.yaml` 的 name、description、`sources[0].type`、`captured_at` 一致。每一行必须有同名目录；每个被校验目录必须有行。

## 动词

| 动词 | 何时用 | 门禁 |
| --- | --- | --- |
| `list` / `show` | 浏览库 | 读 INDEX；报告 name/status/version/coverage 摘要 |
| `create` | 新建 | 冻结变更集合；Generate→Validate→Eval 后 Index 为 published |
| `update-from-source` | 本会话有 source | 声明路径/组件集合；未声明文件保持原字节 |
| `update-from-feedback` | 消费 Apply feedback | 幂等；项目专属 rejected |
| `update-portable` | 无 session source | 不得伪造 source-direct sidecar |
| `validate` | 校验已发布模板 | portable；缺 source 时 replay `not-run` |
| `retire` | 停止新消费 | INDEX 改为 retired；目录保留 |
| `delete` | 移出生产库 | 仅 draft 或 retired；同时删 INDEX 行与目录 |

`split` 不是本版本动词。

退役与删除使用仓库脚本（失败不得改 INDEX）：

```bash
python3 scripts/manage_template_index.py list
python3 scripts/manage_template_index.py show <name>
python3 scripts/manage_template_index.py seed
python3 scripts/manage_template_index.py seed <name>
python3 scripts/manage_template_index.py retire <name> --reason "<reason>"
python3 scripts/manage_template_index.py delete <name>
python3 scripts/manage_template_index.py require-published <name>
```

未传 `--index` / `--templates` 时使用当前工作目录的 `templates/`，不是 skill 根。`seed` 与默认 `require-published` 从 `--catalog` 或已安装 `ui-template-author/catalog/` 拷贝缺失的 published 模板；已有同名行或目录不覆盖，retired 行不救回。安装环境把 `scripts/manage_template_index.py` 换成 `ui-template-author/runtime/manage_template_index.py`。Authoring 的 create/update/retire/delete 只写项目库，不得改 catalog。delete 前必须已 retired。成功后立刻对剩余项目 `templates/` 跑 portable validator。
