# Component family is derived and certified before release

Component Family 不新增第八层，也不维护手工组件清单；它由 Page Type、Pattern、Primitive 的 Stable Entity ID 引用关系与 evidence 推导成闭集。这样能检查发布覆盖是否支撑 capability 和 Page Type，同时避免把模板变成截图特例集。

模板 publish/upgrade 前必须通过 Template Certification Gate：固定 Visual Oracle revision、candidate package 和固定 prompts，先执行 source-blind 干净 Apply，再对每个必需 Pattern 产生 Pattern Equivalence Record。Record 绑定 package、build 和 oracle identity，引用截图与 geometry、spacing、typography、color assertions；失败只能回写 package、Apply skill 或 prompts 后重新干净生成。该 gate 属于模板治理链路，不改变 Apply Mode，也不允许通过修补生成物重判。

## Status

accepted
