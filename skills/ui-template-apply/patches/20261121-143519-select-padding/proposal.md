# Proposal — Select 菜单内边距 + Split 内边距契约

## Intent

消费项目反馈三处观感问题，实测归因：
1. Select 下拉菜单选项背景块左右贴边——`SelectContent` 缺 `p-1`（DropdownMenuContent 有）。
2. 图谱页「border 挨着 border / 宽度不一致」——实测全站线均为 1px/oklch(0.902)，问题是布局：
   `Split.main` 无内边距，页面在其中直接放带边框 Panel，其 border 与 header 底线、Split 分隔线相邻，
   视觉叠成双线。

## 改动

- `ui/select`：SelectContent 补 `p-1`（选中块内缩 4px，与 dropdown 一致）。
- `blocks/surfaces`：Split 注释补「内边距契约」——main 列无 padding，内容必须自带（Body 或全幅 surface）。
- quiet-inset 0.6.5 / workbench-shell 5.0.17。

## Validation

- validate ×2 0 error；make check 48 OK（skip=1）
- 消费项目：graph main 改用 Body；重锁后 tsc/eslint/build/vitest、fidelity 7/7；部署后线上复查
  下拉 padding 与图谱双线消失。
