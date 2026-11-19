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

## 受锁 block 的视觉缺陷

缺陷在 `ui-template.lock.json` 的 `files` 里（例如 `src/components/blocks/data-table.tsx`、`src/components/blocks/log-view.tsx`）时，不改项目副本，也不把这条审查勾成完成。在该路由下写锁定路径和将包含修改的模板版本：

```markdown
- [ ] lock: src/components/blocks/data-table.tsx 页脚样式 → upstream: 5.5.0
```

`validate_package.py project` 在锁的 `version` 还小于 `upstream` 时报 J13；行首仍是 `- [ ]` 时照常报 J11。升级到该版本、按 update 重拍这条路由之后，才改成 `- [x]`。级别色、页脚样式这类差异走这条路径，不在页面里 fork。

```yaml
# ui-decisions.yaml
feedback:
  - said: "设置页左侧导航跟着内容一起滚走了"
    layer: block
    change: SectionLayout 宽容器下导航与内容各自滚动；窄容器单行横向滚动
    verified: [/settings/general, /settings/keys]
```

## 升级库或风格包

```bash
python3 <skill>/scripts/install_registry.py --project . --status    # new / upstream / local / conflict
python3 <skill>/scripts/install_registry.py --project . --upgrade   # 覆盖未改动文件，列出冲突
```

`src/styles/theme.css` 不会成为 conflict（状态 `merge`）：取新包主题，项目改过的白名单 token 保留项目值，
项目没改过的取新值（lock 的 `theme_base` 记录安装时的包值，三方比较）；项目改过的非白名单 token 被丢弃并逐条打印
`DROPPED`——仍要保留就改回去并记入 `ui-decisions.yaml → theme_deviations`（否则 J12 报错）。

`conflict` 文件手工合并后执行 `install_registry.py --project . --resolve <文件>`（以当前上游为基线，之后算作 local 修改），
再记入 `local_edits`；之后重新执行 05 和 07。`validate_package.py project .` 会检查 `pages` 的 pattern 名（J07）与 `feedback` 条目（J08）。
