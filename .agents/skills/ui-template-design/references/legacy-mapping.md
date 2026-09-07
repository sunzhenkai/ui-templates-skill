# Legacy mapping

existing 在新 token freeze 之前必须有旧→新表 `02-legacy-mapping.yaml`，并尽量用脚本批量替换。未入表的旧值 fail closed：补 mapping 或明确 excluded。

```text
Old (forbidden)          New (token)
text-gray-500            text-muted-foreground
text-gray-900            text-foreground
bg-white                 bg-background
bg-gray-50               bg-muted
rounded-lg               radius-md
p-6                      space-6
```

这一步去掉重复劳动，不是一次视觉完美。无 mapping 就手工改页视为跳过 Phase 1.5。
