## ADDED Requirements

### Requirement: Round 4 必答矩阵（chrome 几何与密度盲区）
repo-literal-graph-v1 采集 SHALL 在 round 1–3 基础上追加机器强制问题，沉默与未作答等价，缺失即 `MANDATORY_FACT_MISSING`：

1. `chrome-edge:{scene}`：shell scene 声明 `shell_variant: inset` 且声明 `page-header` / `page-toolbar` 槽位时，canvas 槽位必须携带 `padding_block_start` 事实（token-ref 或显式 `zero` negative），回答「chrome 是否紧贴画布 block-start 边缘」。
2. `content-region:{scene}`：声明 `page-header` / `page-toolbar` 槽位的 shell scene 必须声明 `content` 槽位（layout slot role 闭集新增 `content`），携带 block-start 间距事实（`padding_block_start` 或 `gap`，token-ref 或显式 zero negative）与 `scroll_block` 事实。
3. `header-anatomy:{component}`：scope.components 中名称命中页头闭集（`page-header` 或以 `-header` 结尾）的组件必须携带 `anatomy` 事实（component_geometry facet，闭集语义 `icon-title | title-only`）。
4. `nav-item-geometry:{scene}`：声明 section-nav usage 的 scene 必须在 section-nav 槽位携带条目 `size` 几何事实（token-ref）。
5. `nav-item-type:{scene}`：同上 scene 必须携带 section-nav 条目 default 与 selected 态的 `text` token-ref 状态事实。
6. `row-disclosure:{component}`：名称命中 data-table 闭集的组件必须携带行二级内容（如 row-actions/row-secondary-text）default 与 hover 态的 `visibility` 状态事实。

#### Scenario: 页头槽位存在但 canvas block-start padding 沉默
- **WHEN** inset shell graph 声明 page-header 槽位，canvas 槽位无 `padding_block_start` 事实且无指向该 scene 的 exclusion
- **THEN** 采集报 `MANDATORY_FACT_MISSING`，缺口标签 `chrome-edge:shell`

#### Scenario: content 槽位与间距、滚动事实完整
- **WHEN** inset shell graph 声明 content 槽位并携带 `padding_block_start` 与 `scroll_block` 事实
- **THEN** 对应缺口标签解析为 observed，且投影生成 `region.<scene>.content` 嵌套于 page-canvas 之下

#### Scenario: page-header anatomy 沉默
- **WHEN** scope.components 含 page-header 且无 anatomy 事实
- **THEN** 采集报 `MANDATORY_FACT_MISSING`，缺口标签 `header-anatomy:page-header`

#### Scenario: visibility hidden 未登记 negative fact
- **WHEN** fidelity state record 声明 `visibility: hidden` 但 negative_facts 无对应条目
- **THEN** validator 报 `FIDELITY_NEGATIVE_FACT_MISSING` 且 fidelity 无效
