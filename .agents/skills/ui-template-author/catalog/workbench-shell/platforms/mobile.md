# mobile 平台壳

Mobile 是独立原生平台路径，不是 Web 小 viewport 的别名。它遵守 [`../spec.md`](../spec.md) 的 token 角色、状态与可访问性规则；精确 expected 只从 [`../tokens.yaml`](../tokens.yaml) 读取，provenance 见 [`../evidence.yaml`](../evidence.yaml)。

## 主题映射

- [TOKEN-008] 来源 Mobile 使用不同颜色表示法，但模板只保留语义映射：background/foreground、surface、brand 与状态角色均映射到当前主题 token，不在平台 prose 维护第二套精确颜色。
- [TOKEN-009] 原生 elevation 以 surface 层级表达；嵌套表面提升一级，具体颜色、边界、radius 与 shadow 从当前 token map 读取。
- [TOKEN-010] 原生 Sheet 与普通控件使用不同 radius 语义，但精确值只由当前 `radius` token 映射。
- [TOKEN-011] Mobile 不直接复用 Web shell 或 Web breakpoint；跨平台只共享语义角色和稳定 rule IDs，不混用未归一的来源值。

## 布局

```text
safe-area root
└─ workspace stack
   ├─ native bottom-tab shell
   └─ detail / modal navigation stack
```

- [LAYOUT-010] bottom tab 背景映射页面背景；active/inactive tint 分别映射 foreground/muted-foreground；label 使用当前 typography scale。
- [LAYOUT-011] Inbox 与 Chat 的 unread 使用 brand badge；零值不显示，overflow 文案由产品本地化决定。
- [ROUTE-011] More 不落地普通 route，而是打开适用 popover/form sheet；workspace switch、settings 与 secondary collections 从这里进入。
- [ROUTE-012] 从 tab 下钻 detail 后返回原 tab；深层 filter/picker 关闭后恢复原集合状态。

## Sheet、键盘与触控

- [AX-065] picker/filter 使用平台原生 form sheet 与可用 detent；grabber、safe area、radius 和内容高度遵守平台能力及当前 token 映射。
- [AX-066] create/search 等 modal 有可见 title、close 和 primary action。
- [AX-067] 可点目标满足平台最小触控要求；editable text 按 @NN-005 映射，避免聚焦缩放。
- [AX-068] 键盘出现时 composer/input 贴合 keyboard safe area；集合或 timeline 不跳离用户位置。
- [AX-069] swipe、long press、drag 均提供等价 button/menu 路径。
