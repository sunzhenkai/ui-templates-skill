---
name: ui-template
description: 从运行中的 Web 站点(URL)、代码仓库(本地路径或 Git 地址)或图片(截图/设计稿)中提取 UI 设计风格,创建/导入为可复用的设计规范文档,统一存入仓库 templates/ 目录。当用户想把某个网站、页面、截图或项目的视觉风格"做成模板"、"导入 UI 模板"、"提取设计规范"、"以后照这个风格做页面"时使用;即使用户没有明说"模板",只要意图是沉淀/复用某种 UI 风格,就应使用本 skill。
---

# ui-template — UI 模板创建/导入

把外部来源(Web 站点、代码仓库、图片)的 UI 风格提炼成**设计规范文档**,作为可复用模板沉淀到仓库的 `templates/` 目录。产物是文档,不是可运行代码。

## 何时使用

- 用户给了一个 URL、仓库路径/地址、或图片,希望"提取风格 / 做成模板 / 以后复用"。
- 用户想浏览、复用或更新 `templates/` 里已有的模板。

不适用于:直接生成页面代码(那是模板的**消费方**做的事)、与 UI 风格无关的任务。

## 核心原则

- **产物是规范,不是代码的堆砌**:规范文档要能让一个没看过原站点的人(或 AI)据此还原出风格。记录"规则"(配色角色、字号阶梯、间距体系),而不是罗列某几个元素的具体样式。
- **注明来源与置信度**:从图片反推的值是估算,要标注;从代码/ computed style 提取的值是精确的。混用会让模板失去可信度。
- **模板自包含**:每个模板目录独立,引用外部来源只放 URL/路径和采集时间,不依赖来源持续可用。

## 工作流程

### 1. 确定来源类型与模板名

- 来源三选一:`web`(运行中的站点)、`repo`(代码仓库)、`image`(图片/截图)。
- 与用户确认模板名(英文小写连字符,如 `linear-dark`),作为 `templates/<name>/` 目录名。
- 若 `templates/<name>/` 已存在,询问是**更新**还是**另建**。

### 2. 按来源提取设计信息

按来源类型阅读对应的提取指南,照着执行:

- `web` → 阅读 [references/source-web.md](references/source-web.md)
- `repo` → 阅读 [references/source-repo.md](references/source-repo.md)
- `image` → 阅读 [references/source-image.md](references/source-image.md)

提取的目标信息(规范文档的骨架)见 [references/spec-format.md](references/spec-format.md)。

### 3. 生成模板

在 `templates/<name>/` 下创建:

```
templates/<name>/
├── spec.md        # 设计规范文档(主体),格式见 references/spec-format.md
├── meta.yaml      # 元数据,格式见 references/spec-format.md 末尾
└── assets/        # 佐证材料:截图、色板等(可选,但 web/image 来源建议至少留一张截图)
```

写作要求:

- 全部使用简体中文;色值、字体名、CSS 属性等技术内容保留原文。
- 每个估算值标注 `(估算)`,精确值可注明出处(如"来自 `:root` CSS 变量")。
- 配色必须给出**角色语义**(背景/前景/主色/强调/边框/成功/警告等),不能只列色卡。
- 有佐证截图时放入 `assets/` 并在 spec.md 中引用。

### 4. 更新索引与收尾

- 更新仓库根目录的 `templates/INDEX.md`(不存在则创建):追加一行 `| <name> | <一句话风格描述> | <来源类型> | <采集日期> |`。
- 向用户汇报:模板路径、提取到的关键 token 摘要(主色、字体、间距基调)、哪些是估算值。

## 复用已有模板

当用户说"用某个模板做页面"时:阅读 `templates/<name>/spec.md`,把其中的 token 与规则作为设计约束交给后续实现。本 skill 只负责模板的创建/导入/维护,不负责页面实现。
