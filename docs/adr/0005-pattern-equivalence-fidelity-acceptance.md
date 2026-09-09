# Pattern equivalence is the fidelity acceptance unit

模板保真验收采用 Visual Equivalence，而不是逐像素克隆：在相同内容、状态、主题和 viewport 下，结构、层级、密度、间距节奏、色彩表面和组件形态必须基本一致。因为 Apply 常需要实现原版不存在的新业务页，整页像素对照不能作为普遍门禁。

因此，新业务页的验收对象是它组合的已声明 Pattern；已声明 Component Family 必须覆盖该模板 capability 和 Page Type 所需的 Primitive 与 Pattern 闭集。粒度遵守 Fidelity Granularity：独立交互件是 Primitive，可复用组合是 Pattern，页面骨架是 Page Type，避免截图特例化或不可复用巨对象。

## Status

accepted
