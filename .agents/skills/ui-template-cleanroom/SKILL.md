---
name: ui-template-cleanroom
description: 验证 ui-template skills 改动的端到端流程：在空 Vite 项目里只依据 ui-template-apply 文档实现列表、详情、表单、设置页，并跑全部检查。改了 library、patterns、steps、风格包之后使用。仅用于本仓库。
metadata:
  internal: true
---

# ui-template-cleanroom

目的：证明**只读 skill 文档**就能做出合格页面。执行者不得参考以往 clean-room 产物或任何消费项目代码。

1. `npm create vite@latest <dir> -- --template react-ts --no-interactive`，在仓库外的临时目录。
2. 严格按 apply `steps/01`–`05` 执行；遇到文档没写清、必须靠经验补的地方，**记录为文档缺陷**。
3. 页面最少：列表（筛选 + load more + 行链接 + 行菜单删除确认）、详情（属性 + tabs + Markdown + LogView）、
   新建表单（字段校验 + 服务端错误回填）、设置（SectionLayout + 开关）、404。数据用内存 mock。
4. 检查：`tsc -b`、`eslint src`、`validate_package.py project .`、`vite build && vite preview`、
   `check_rendered.py <全部路由> --shots .ui-shots`（1280/768/390 × 浅/深）。
5. 每个失败：判断是 block 缺陷、pattern/step 文档缺陷还是执行者错误；前两者在本仓库修复（`make sync`），
   `install_registry.py --upgrade` 后重跑 4，直到 0 error。
6. 产出：`NOTES.md`（发现的文档缺陷与修复）+ 截图目录；不提交到本仓库。
