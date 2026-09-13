## MODIFIED Requirements

### Requirement: Current-build verification
Phase 8 SHALL 使用当前 output root 与 build identity 的真实浏览器证据验证 style consistency、information semantics、placement、states 和 responsive behavior；静态检查或旧证据 SHALL 不能替代。required scenario 集合 SHALL 按确定性规则从模板 coverage、included routes、fidelity records 与 placement closure 派生：Active Instance 声明的每条 placement geometry 记录 SHALL 产生至少一条 computed style 或 logical geometry 断言 scenario（逐 token 验证 margin/radius/border/shadow/背景），pattern 闭包中每个 pattern SHALL 产生至少一条存在性与位置 scenario（含 section navigation 类 pattern 的区域归属）。派生集合缺失任一应产 scenario SHALL fail closed，证据集 SHALL NOT 缩窄为与上游事实闭包同盲的最小集。

#### Scenario: 页面通过
- **WHEN** included 页面和状态在当前构建中验证通过
- **THEN** checkpoint 登录证据文件、build identity 和复验的 stable IDs

#### Scenario: 浏览器不可用
- **WHEN** 真实浏览器不可用
- **THEN** Apply 停止，不得宣称完成

#### Scenario: 内容卡片几何被验证
- **WHEN** 模板 placement 声明内容区悬浮卡片（margin/radius/border/shadow token）
- **THEN** Phase 8 派生对应 computed-style scenario，逐项断言当前构建的实际样式值并留存证据；未断言即 Phase 8 不 complete

#### Scenario: section navigation 位置被验证
- **WHEN** pattern 闭包含卡内二级导航 pattern
- **THEN** Phase 8 派生存在性+位置 scenario，断言其位于内容卡片内部左列（或模板声明的位置），偏离即 failed record

#### Scenario: 证据集不得自我缩窄
- **WHEN** scenario 派生集合少于 placement geometry 记录与 pattern 闭包的应产数量
- **THEN** verification 校验以 missing scenario fail closed，不得宣称通过
