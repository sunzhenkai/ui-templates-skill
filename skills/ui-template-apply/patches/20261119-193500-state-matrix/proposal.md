# 状态矩阵、390 目检与受锁缺陷

- target: skills/ui-template-apply
- mode: update
- patch: 20261119-193500-state-matrix
- risk: medium
- status: proposed

## Intent

产品页验收从「路由能打开、和原型同构」扩到每个 pattern 的必拍状态。已登记 `pages` 时，缺审查文件或少状态是 J10 错误。受锁文件上的视觉缺陷必须写 `upstream:` 版本，锁版本未达到前不能关账。补 collection 身份与空页脚、settings 回显、log 窄屏换行与单计数、detail 窄屏卡片、shell 移动端目录、canvas 图谱规则。LogView 在容器窄于 768 时换行。

不改级别色和表格页脚样式（仍由受锁缺陷流程关闭）。不改保真零像素容差。没有 `pages` 的新装项目，J10 仍是警告。

配套：`solo-skills` 的 `skills/ui-kit/patches/20261119-193500-review-gate`。

## Conflict check

`validate project` 在无页面清单时仍返回 0，以保住 `tests/test_install.py` 的新装契约。`pages` 继续接受字符串写法；映射写法只增加 `pattern` / `states`。`archetype_for` 对已有 pattern 的返回值不变；`canvas` 没有原型。collection 的 self_review 仍不超过 8 条，本轮改写已有两条而不是追加。

## Rationale

原型对照看不出空表、同名行、已保存设置和密集图谱。390 以前只跑几何不变量。锁把 block 缺陷收成可以勾掉的保留项。这些都要变成脚本能失败的条件。

## Files

- skills/ui-template-apply/steps/01-decide.md：`pages` 可写 pattern 与 states
- skills/ui-template-apply/steps/05-verify.md：R20
- skills/ui-template-apply/steps/06-iterate.md：受锁缺陷与 upstream
- skills/ui-template-apply/steps/07-review.md：状态拍摄与清单
- skills/ui-template-apply/patterns/index.md：canvas
- skills/ui-template-apply/patterns/canvas.md：新增
- skills/ui-template-apply/patterns/collection.md、settings.md、log-viewer.md、detail.md、shell.md：缺的规则
- skills/ui-template-apply/scripts/validate_package.py：J10 错误、状态行、J13
- skills/ui-template-apply/scripts/review_visual.py：状态截图与 `#state`
- skills/ui-template-apply/scripts/check_rendered.py：R20
- skills/ui-template-apply/library/blocks/log-view.tsx：窄容器换行
- tests/test_tooling.py：状态、J10、J13、R20
- tests/fixtures/rendered-empty-footer.html：R20 夹具

## Validation

- 应用前：`git apply --check --recount`
- 应用后：`python3 -m unittest tests/test_tooling.py tests/test_install.py tests/test_package_validation.py`（跳过需要浏览器时，R20 用例单独标明）
- `validate_package.py patterns` 0 error
