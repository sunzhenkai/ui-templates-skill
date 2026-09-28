# 闭合 chrome 几何与密度盲区：页头贴边、chrome-内容间距、页头 icon、section-nav 字阶、行级渐进披露

## 背景

`workbench-shell` example web 对照 session source（multica @200dcb44）复测出五类系统性缺陷：

1. 页头顶边与画布上边缘之间有 9px 缝隙（画布 padding-block-start + sticky 拓扑副作用）；source 中页头紧贴画布上边缘，inset 由画布相对 shell root 的外边距提供，画布内部 block-start padding 为零。
2. 页头标题左侧缺 leading icon；source 中集合页页头统一 icon-title 解剖（size-4、muted 前景、gap-2）。
3. 设置 section 导航条目字阶错档（13px label vs source 14px body）、条目几何与选中/未选中前景色无绑定；source 有 min-h-9、rounded-lg、selected 用 surface-selected + medium 字重、未选中 muted 前景。
4. chrome（页头/工具条）与下方内容块零间距；source 中间距由内容区 padding-block-start 提供（8–32px 按页型）。
5. 行级渐进披露完全缺失；source 中 data-table/列表行 hover 披露行操作（默认隐藏）、hover 时状态说明文字与操作互换。

## 归因（缺陷 → 断点）

| 缺陷 | 断点 | 说明 |
| --- | --- | --- |
| 1 页头缝隙 | A 采集盲区 | 必答矩阵不问「画布 block-start 是否在 chrome 之上留 padding」；round 1 的 inset 几何五问接受任一方向 padding 即算作答，四向完整性只有散文约束 |
| 2 页头 icon | A 采集盲区 | `component.page-header` 定义 facts 为空，必答矩阵不问页头 anatomy |
| 3 设置导航字阶/几何/前景色 | A 采集盲区 + B 投影拍平 | round 2 只问 section-nav 的 background token 与 anatomy；条目 size/typography/前景色状态从未被问，state_presentations 的 `text`/`visibility` 能力闲置 |
| 4 chrome-内容间距 | A 采集盲区 | 事实模型无「chrome 之下内容区」槽位，间距无处可写 |
| 5 行级渐进披露 | A 采集盲区 | `visibility` 属性在 vocab 中存在，但无人被强制回答 default/hover 的可见性 |

## 变更

1. **采集端（round 4 必答矩阵，`chrome.py` + `repo-capture-format.md`）**：
   - `chrome-edge:{scene}`：inset shell 声明 page-header/page-toolbar 槽位时，canvas 槽位必须携带 `padding_block_start` 事实（token-ref 或显式 `zero` negative）。
   - `content-region:{scene}`：上述 scene 必须声明 `content` 槽位（新增 SLOT_ROLE）并携带 block-start 间距事实（`padding_block_start`/`gap`）与 `scroll_block` 事实。
   - `header-anatomy:{component}`：名称命中页头闭集（`page-header` 或以 `-header` 结尾）的组件必须携带 `anatomy` 事实（闭集 `icon-title | title-only`，新增语义值）。
   - `nav-item-geometry:{scene}` / `nav-item-type:{scene}`：声明 section-nav usage 的 scene 必须携带条目 `size` 几何事实与 default/selected 态的 `text` token-ref 状态事实。
   - `row-disclosure:{component}`：名称命中 data-table 闭集的组件必须携带行二级内容的 default/hover `visibility` 状态事实。
2. **schema（`capture.py` vocab）**：SLOT_ROLES 增 `content`；SEMANTIC_VALUES 增 `icon-title`、`title-only`。
3. **校验（`template_validation/fidelity.py` + 三 runtime 同步）**：`visibility: hidden` 必须登记 explicit negative fact，否则 `FIDELITY_NEGATIVE_FACT_MISSING`（与 text_decoration none 同等 fail-closed）。
4. **消费端（apply）**：`derive_scenarios` 对新事实自动派生 Phase 8 scenario（region/scroll/anatomy/state/geometry 既有管道）；apply 参考文档补消费义务。
5. **存量重采（本 goal 授权）**：workbench-shell 采集图按 source 事实补齐 round 4 应答，重投影 fidelity，core 层（layout geometry、page-header anatomy、rules 声明）随源事实更新，模板 3.1.1 → 3.2.0，catalog 副本同步，certification gate 通过后由 qodercn + qwen3.8-flash 重建 example web 复测。

## 影响

- 新采集的 graph 缺 round 4 应答即 `MANDATORY_FACT_MISSING`（fail closed，与 round 1–3 同级）。
- 存量模板不含新结构，validator 新检查只在事实存在时生效（存量兼容原则）。
- LAYOUT-110「page-header sticky in canvas」与 source 事实（header 静态、内容区独立滚动域）不符，随重采修正为静态 chrome + content 滚动域拓扑。
