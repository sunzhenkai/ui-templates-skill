# Vendor reference snapshots

这些文件是 Apply bundle 的固定第三方规则快照；不修改原文，升级时替换快照、更新 revision 与全部 file SHA-256。

| directory | source | revision | license | allowed triggers |
| --- | --- | --- | --- | --- |
| `frontend-design/` | `anthropics/skills` | snapshot `2026-08-28`, content digest in `vendor.yaml` | Apache-2.0 | visual direction |
| `shadcn/` | `shadcn/ui` | `683a5a9b370acdb7785a0529434e6a3b8c7e0441` | MIT | shadcn component system |
| `tailwind-css-patterns/` | `giuseppe-trisciuoglio/developer-kit` | `50f0b945bd81ee1dac377f609871e63b732347fa` | MIT | Tailwind styling |
| `tailwind-design-system/` | `wshobson/agents` | `38e19c20d2b154510b0e624a2e3e186b19b5c527` | MIT | Tailwind styling / v4 token projection |

Snapshot 排除图片、evals、agent adapter 与无关执行脚本。`vendor.yaml` 是 allowlist 唯一事实源；任何未列文件不得进入 bundle，digest mismatch 时不得加载。
