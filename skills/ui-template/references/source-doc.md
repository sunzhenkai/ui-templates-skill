# 来源:设计文档(doc)

从 Markdown、PDF 等设计/规范文档提取模板。核心思路:**布局与交互规则按文档精确转写;视觉 token 的缺口显式回填默认值,不得伪装成来源派生。**

## 步骤

1. **通读并分类内容**
   - 布局、chrome、断点、交互、组件规则:精确转写,置信度高。
   - 颜色、字体、阴影等视觉值:文档给了才记录(origin: `source`);没给就是缺口,不是"待消费方自选"。

2. **索取视觉参考**
   - 尽量向用户要参考截图或原产品 URL;拿到后按 `source-image.md` / `source-web.md` 补采。
   - 拿不到时在 `meta.yaml` coverage 标注 `visual_reference: false`,并回填一套完整的模板默认值(origin: `default`)。

3. **回填默认值并记录决策**
   - 缺口字段在 `tokens.yaml` 给出默认值,决策记录说明选择理由(通常依据模板风格关键词与密度推导)。
   - 禁止留空,禁止把"来源未体现(消费方自选)"作为最终状态。

4. **置信度拆分**
   - `spec.md` 中分别说明 layout 与 visual 的置信度;`meta.yaml` 的 `confidence` 取最弱维度。
   - 无视觉参考时整体 `confidence` 上限为 `medium`。

## 注意事项

- 文档中的规则互相矛盾时,以更具体/更新的规则为准,并记录矛盾点。
- 不把文档中的业务实体、项目名、目录结构带入模板;泛化后再写入。
- 文档描述的状态不完整时,交互组件仍必须补齐 hover、focus-visible、disabled、selected。
