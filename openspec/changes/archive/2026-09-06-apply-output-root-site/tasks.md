## 1. 探测与契约

- [x] 1.1 `detect_architecture_site` 只看输出根文件；空子目录不再判 `existing`
- [x] 1.2 `architecture.schema.json` 必填 `output_root`；可选 `observed_constraints`
- [x] 1.3 checker 对 `output_root` 复跑探测，`site` 不一致失败
- [x] 1.4 CLI `architecture-site` 参数语义改为输出根

## 2. Skill 与规格

- [x] 2.1 更新 Apply SKILL / apply-workflow / toolchain：输出根判定与禁止自动确认
- [x] 2.2 更新 OpenSpec base 与 FUNCTIONAL-LOOP
- [x] 2.3 记录 sage 失败经验

## 3. 验证

- [x] 3.1 unittest：嵌套空应用 greenfield；site mismatch
- [x] 3.2 eval：monorepo 空输出根必须选型
- [x] 3.3 `make test` / `make eval` / `make validate` / `make mirror-write` / `make mirror-check`
