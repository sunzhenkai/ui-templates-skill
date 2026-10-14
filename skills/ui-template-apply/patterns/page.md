---
name: page
when: 任意路由页面的标题区、操作区和内容宽度
blocks: [blocks/surfaces, blocks/page-header]
decisions:
  - key: page.primary_action
    options: [header, none]
    default: header
self_review:
  - 每页恰好一个 h1（PageHeader 的 title）
  - 主操作 ≤ 1 个；次要操作 ≤ 2 个外露，其余进溢出菜单
  - 内容宽度选了 reading / form / full 之一，没有自定义 max-w
  - 窄容器下标题截断而不是换行把操作挤掉
  - 页面从 reference 原型复制而来；lint 无 no-layout-classes 报错
---

# Page

起点：从 `reference/src/pages/` 复制最接近的原型（见 `reference/README.md`），只换数据。

页面只组合 surfaces（`blocks/surfaces`），不写 border / rounded / padding / margin / gap / divide / shadow
（lint `ui-template/no-layout-classes`）。几何全部归 surface：

| surface | 用途 | 几何 |
|---|---|---|
| `AppShell` 画布（frame） | 整个内容区 | 唯一的 radius-xl，裁剪子元素 |
| `Page` | 一个路由 | PageHeader（48px，底线）+ Body；默认 `padded` 把 Body 放进 main `ScrollRegion`；`layout="fill"` 由子表面声明滚动区（Split / SectionLayout / 对话 `ScrollRegion` + ComposerDock） |
| `Body` | 内容列 | 内边距与宽度 `reading / form / full` |
| `Split` / `SectionLayout` / `ListDetailLayout` | 侧栏 + 内容 | 分割线由容器画：从页头底线一直到画布底边 |
| `Panel` / DataTable / LogView | 有边框的区域 | radius-lg，内部平铺子元素无圆角 |
| `Section` `Stack` `Grid` `Toolbar` `Actions` `Inline` `Properties` `Rows` `Centered` | 页内节奏 | 只有固定档位（gap xs–xl） |

```tsx
<Page title={project.name} breadcrumbs={[{ label: "项目", to: "/projects" }]}
  primary={<Button size="sm" onClick={openCreate}><PlusIcon />新建</Button>}
  actions={[{ label: "复制链接", onSelect: copyLink }, { label: "删除", onSelect: remove, destructive: true }]}>
  …
</Page>
```

规则
- 宽度：列表/看板 `full`；表单 `form`；文档、对话 `reading`。
- 面包屑只放祖先；顶层页面不要面包屑。破坏性操作在溢出菜单末尾，`destructive: true`。
- 需要的几何 surface 没有：给 surface 加 prop（改 skill 库），不要在页面里写类名绕过 lint。
