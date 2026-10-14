# 06 迭代：反馈分诊与升级

## 用户反馈分诊

每条反馈先定层，再改，最后记录。层从低到高，修在**能覆盖所有同类问题的最低层**：

| 层 | 例子 | 改哪里 |
|---|---|---|
| theme | 太亮/太挤/字太小、整体颜色 | `src/styles/theme.css`（通用则回馈风格包） |
| block | 表格行距、某组件在窄屏的行为 | `src/components/blocks/*`（通用则回馈 skill 库） |
| pattern | 某类页面结构不对 | 项目内按 pattern 改；规则本身有误则改 pattern 文档 |
| page | 只关乎这一页的内容/文案 | 页面文件 |

举一反三：定层后搜索同类用法（同一 block / 同一 pattern 的所有页面）一起验证。

```yaml
# ui-decisions.yaml
feedback:
  - said: "设置页左侧导航跟着内容一起滚走了"
    layer: block
    change: SectionLayout 宽容器下 sticky；窄容器单行横向滚动
    verified: [/settings/general, /settings/keys]
```

## 升级库或风格包

```bash
python3 <skill>/scripts/install_registry.py --project . --status    # new / upstream / local / conflict
python3 <skill>/scripts/install_registry.py --project . --upgrade   # 覆盖未改动文件，列出冲突
```

`conflict` 文件手工合并后执行 `install_registry.py --project . --resolve <文件>`（以当前上游为基线，之后算作 local 修改），
再记入 `local_edits`；之后重新执行 05 和 07。`validate_package.py project .` 会检查 `pages` 的 pattern 名（J07）与 `feedback` 条目（J08）。
