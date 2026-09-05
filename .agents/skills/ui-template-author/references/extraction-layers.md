# 分层抽取

L0–L6 只是变更集合的标签，不是七层完成仪式。从源创建或更新必须声明**本次改哪些路径或组件**；未纳入的文件保持原字节。禁止用“3–5 个代表组件”冒充完整 coverage。

## 标签（可选，用于命名变更集合）

| 标签 | 典型路径 |
| --- | --- |
| L0 身份 | `meta.yaml` 的 sources / revision / conformance |
| L1 壳 / chrome | `fidelity.yaml` layout_scenes |
| L2 Token | `tokens.yaml`、`evidence.yaml` |
| L3 Scene / 路由 | `routes-and-layouts.md` |
| L4 原子组件 | `components.md` 基础控件 |
| L5 复合组件 | page-header、list-grid、dialog 等 |
| L6 Apply 映射 | `apply/playbook.md`、`quality.md` |

## Intake

本次从源导入或从源更新开始前必须冻结并报告：

- session source 与将写入的 source ID / revision；
- **本次变更集合**（路径和/或组件名单；可用上表标签分组）；
- conformance：默认 structural；style-only 需要理由。

未声明变更集合不得 Generate-from-source。未纳入本次集合的文件保持原字节，不得借“整理文档”重写。用仓库脚本核对：

```bash
python3 scripts/manage_template_index.py check-changeset \
  --before <previous-template-dir> --after <candidate-dir> \
  --allow <relative-path> [--allow ...]
```

安装环境把 `scripts/` 换成 `ui-template-author/runtime/manage_template_index.py`。部分变更失败则整次不 Index。

## 诚实覆盖

声称“常用组件已有规格”时，这些名字在 `coverage.components` 必须是 observed 或 unsupported。defaulted 可以存在，但不能支撑高度一致，也不得把 `confidence.components` 写成 high。无 session source 时不得把 defaulted 抬成 observed。
