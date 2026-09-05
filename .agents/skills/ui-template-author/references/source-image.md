# 来源：图片/截图（image）

核心：整体风格靠观察，颜色靠取样，尺寸按已知画布比例估算；不得把估算伪装为精确来源值。

## 提取步骤

1. 记录 `meta.sources[]`：文件名/用户引用、原始文件 SHA-256 revision、采集时间。先确认用户有权提供和用于模板提取。
2. 判断明暗、密度、圆角倾向和 3–6 个风格关键词；多张同产品图片按页面/主题/视口分别登记 coverage。多图若能看出不同壳形态，分别登记；单图/看不清则 layout 不高过 medium，未见形态不编造。清单见 [extraction-layers.md](extraction-layers.md)。
3. 以坐标/区域取样并聚类主色，再映射到背景、文字、强调和状态角色。抗锯齿、压缩、渐变会引入偏差，统一使用 `origin: estimated`。
4. 字体只记录可证明的类别或“疑似”；字号、间距、圆角、阴影依据设计画布尺寸和像素区域估算。未知原始缩放时降低 confidence，不假装精确。
5. 图片未展示的 token/交互状态必须用 `origin: default` 补全，并写可审计 basis/decision ID；不能写“消费者自选”。

## evidence

每个 estimated token 记录 source ID/revision、方法（取色、聚类、像素测量、比例推断）、locator（`image@x,y`、bounding box 或区域描述）、artifact、captured_at 与 confidence。聚类归一要记录选择角色的依据。default evidence 明确“图片未展示什么”以及采用默认值的设计/可访问性基础。

原图入库前逐项评估 license、redistribution 和隐私。含真实姓名、邮箱、头像、地址、内部域名、账号数据或设备标识时先裁剪/模糊/替换，并记录 `redaction: applied`；许可未知/禁止再分发或无法安全脱敏时，不复制原图，只保留 digest、受控来源引用和不含敏感内容的描述。

## 置信度与 coverage

风格清晰、画布尺寸已知且多图一致时可 medium；模糊、单图、未知缩放通常 low。不得仅因颜色取样成功就把 layout/components 标 high。未出现的页面、平台、主题、组件和状态分别标 defaulted 或 unsupported。
