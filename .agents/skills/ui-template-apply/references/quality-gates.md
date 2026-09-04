# Template Apply Quality Gates

门禁由模板稳定 rule IDs、Intake included scope 和 coverage 驱动，不由固定 checklist 数量驱动。每条通过结论都必须在 `08-verification.json` 或 `09-review.md` front matter 中绑定当前 template digest、source identity、build identity、route、viewport、theme、state、expected/actual 与 evidence refs；仅有 prose“已检查”无效。

## 证据新鲜度

开始和恢复 Phase 8/9 时核对 checkpoint：template/tokens/artifact/source/build 任一身份不一致，旧证据 stale。source/build 变化至少重开 Phase 8；模板/scope/token/artifact 变化按最早 phase 恢复。截图文件存在但无法关联当前 build 不算证据。

## 必须覆盖的规则域

实际记录数量由模板 rule IDs、coverage 和 included routes 决定；没有适用规则的域要在 Intake 说明，而不是伪造固定条数。

### 路由、URL 与信息架构

验证跨页目的地为 link、当前项语义、深链/刷新/前进后退、可恢复状态、无效/未授权/not-found、一次性参数清理、标题/面包屑/主要动作一致。每个 route/state 记录相关 `ROUTE-###`/`LAYOUT-###` expected/actual。

### 可访问性与焦点

用真实 Accessibility tree 和键盘路径验证 role/name/state、icon-only name、label、无嵌套交互、非颜色状态、focus-visible、弹层焦点进入/限制/Esc/返回及对比度。记录 `AX-###`；颜色/焦点环 expected 来自 token/rule，不凭肉眼。

### 布局、滚动与响应式

对 coverage 声明的每个 viewport/platform 验证 root/内部滚动归属、稳定 chrome、无意外横向滚动、允许横滚的替代操作、导航/动作降级、浮层/FAB/安全区和 included 页面模式。若存在 `fidelity.yaml`，Phase 8 required scenario IDs 由 profile records 派生；negative facts 不得被组件库默认覆盖。记录 `LAYOUT-###`/`RESP-###`；不强制模板未声明的固定三个视口。

### Tokens 与 computed style

从 `01-token-map.yaml` 取得 expected，在当前 build 读取 body、标题、导航、文本、按钮、输入、容器、表格/指标、浮层等适用元素的 computed color/type/spacing/radius/border/shadow/motion。双主题按 coverage 验证角色一致和对比度。arbitrary/new-token 必须已有 rule ID、理由与确认。记录 `TOKEN-###`/`NN-###`。

### 交互与页面状态

对模板声明且 included 的 default/hover/focus/active/selected/disabled/loading/error/empty/dragging/offline 等状态逐项验证；触屏提供等效操作，loading 保持结构，error 有重试/公告，empty 有下一步。coverage 标 unsupported 的状态不得伪造 passed。

### 全局系统

只验证 Intake included 的搜索、创建、确认、通知、异步进度、错误横幅、快捷键、FAB 等系统；覆盖成功与失败、键盘、浮层和 route 结果。模板未要求或 scope excluded 的系统不靠固定清单强行加入。

### 工程与构建

运行目标项目已声明的构建、静态检查和测试命令，并把命令、退出码、source/build identity、日志 evidence 记录到 progress/verification。项目未配置某类检查时明确 `not-configured`，不得编造命令或把它标 passed。API/目录/状态边界是项目决定，不回写模板。

## Phase 8 通过条件

- 每个 included route × 模板适用 coverage × 关键 state 都有可解析记录或明确可复用证据引用；
- console error/unhandled rejection、AX、computed style、URL/交互失败均为 failed；
- expected/actual 与 rule ID 可追踪，evidence 文件存在；
- 所有记录身份等于 checkpoint 当前身份；
- failed 修复后不得覆写原记录；Phase 9 re-check 必须用 `phase8_record_id` 唯一引用原记录，并在相同 rule ID、expected、route、viewport、theme、state 下记录修复后的 actual 与 current-build evidence。仅有效的 `recheck-passed` 闭合该失败，未关联、重复/未知引用、身份过期或 `recheck-failed` 继续阻断。

waived 仅接受模板契约允许且有稳定 rule ID/理由/期限的 waiver；项目方便性不是 waiver。

## Phase 9 review

review 覆盖视觉、响应式、交互、可访问性、路由、IA、工程。正文可用 P0/P1/P2 分类，但机器 front matter 每条必须是 `recheck-passed` 或 `recheck-failed` 并指向修复后 current-build evidence。P0/P1 未修复只能由用户显式接受并保留理由/范围，不能靠删除 finding 通过；任何 recheck-failed 阻止完成。

## 最终报告

报告基于结构化产物汇总：当前 identities、included/deferred/excluded、按 rule domain 的 passed/failed/waived/recheck、实际命令、stale evidence 处理、P0/P1 接受记录和 feedback UUID。禁止使用“通过 N 项固定清单”替代 coverage/rule-ID 明细。
