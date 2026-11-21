# Proposal — 全组件对照参照实测校准（quiet-inset 0.5.1 → 0.6.0）

## Intent

对 quiet-inset 全组件体系做一轮系统校准：在参照产品（linear.app，登录态）四个代表页面
（documents/activity、settings、agent、command palette）批量采样 computed style，与模板
library 组件默认类逐项对照。采样日期 2026-11-21。

## 采样结果（参照实测）

| 组件 | 参照实测 | 模板现值 | 偏差 |
| --- | --- | --- | --- |
| 浮层阴影（command 面板） | `lch(0 0 0 / 0.08) 0 9px 48px 0, lch(0 0 0 / 0.1) 0 6px 24px 0` | `0 3px 6px -2px .02, 0 1px 1px .04, 0 8px 24px .06` | 模板 F-1 自述「未采到样本，放大估计」——明显偏轻 |
| 控件高度 | search input 28 / combobox 30 / 主按钮 28 / 次按钮 pill 32 | button/input/select h-8 = 32 | meta.yaml 声明「controls 28px」未兑现（与侧栏行高同类） |
| 控件圆角 | input/search/combobox/示例卡 8px；输入卡 10px；面板 12px | input/select/button rounded-lg = 10px | 控件档位应为 md(8)；theme 注释「10px inputs」与实测矛盾 |
| switch | 30×20，全圆轨道，选中 `lch(53 52.26 286.91)` | 32×18.4（default） | 可见差异 |
| command 菜单项 | 高 46px、15px 字、px 12 | `px-2 py-1.5 text-sm` ≈ 32px/13px | 差异大 |
| 按钮形态 | 主/次/自定义按钮全部 pill（9999px） | rounded-lg（10px 矩形） | 形态级差异 |
| 输入卡/示例卡 | 10px + surface-shadow / 8px + 0.5px border | card rounded-xl(12) + ring | 记录，不动（消费项目结构不同） |
| 边框粗细 | 0.5px hairlines | 1px | F-1 已记录（契约对比度），保持 |
| 次要文字字重 | 450（Inter Variable） | 400 | 记录，不动（token 阶梯无 450 档） |

## 改动设计（全部 token 化，默认值保持 workbench-shell 现状）

- `--floating-shadow`：换实测值（两包共享受益——参照浮层语义一致）
- `--control-height`（默认 2rem）→ button size default / input / select trigger 读取；quiet-inset 置 28px
- `--button-radius`（默认 `var(--radius-lg)`）→ button 基础类读取；quiet-inset 置 9999px（pill）
- `--switch-width` / `--switch-height`（默认 32px / 18.4px）→ switch 读取；quiet-inset 置 30/20
- `--command-item-height` / `--command-item-font-size`（默认 2.125rem / 0.875rem）→ CommandItem 读取；
  quiet-inset 置 46px / 15px
- input / select 基础圆角 `rounded-lg` → `rounded-[min(var(--radius-md),12px)]`（=8px，两包一致受益：
  radius-md 在两包均 8px）

## Conflict check

- button/input/select/switch/command 均为共享 library 文件 → 双包升版：quiet-inset 0.6.0（可见行为变化，
  minor）、workbench-shell 5.0.12。
- 契约校验关注颜色对比度与 token 集合，不约束尺寸类；仍跑 validate + make check 全绿。
- 按钮 pill 化改变消费项目观感（wiki 空状态按钮从 10px 圆角变全圆）——这正是对齐参照的目标，
  quiet-inset 的按钮语义即「pill」。

## Files

- `templates/quiet-inset/theme.css`（1 处替换 + 4 个新 token + 注释修正）
- `templates/quiet-inset/meta.yaml`、`CHANGELOG.md`（0.6.0）
- `templates/workbench-shell/meta.yaml`、`CHANGELOG.md`（5.0.12）
- `library/shadcn/ui/{button,input,select,switch,command}.tsx`（token 读取）
- catalog/registry 由 `make sync` 重生成

## Validation

- validate_package ×2 → 0 error；make check 全绿（含 CheckRendered 实跑）
- 消费项目重锁 0.6.0 → 构建 + vitest + 保真 7/7 + 部署后线上复核（按钮 pill、input 28/8px、
  switch 30×20、command 46px、浮层阴影加深）
