# Proposal — 保真脚本支持 pnpm

## Intent

`verify_fidelity.py` 硬性要求 `package-lock.json` 并用 `npm ci`；使用 pnpm 的消费端（`pnpm-lock.yaml`）
直接报错，无法建立保真基线。模板本身对包管理器无约束，脚本应跟随项目已有锁文件。

## 改动

- 检测锁文件：`pnpm-lock.yaml` → pnpm，`package-lock.json` → npm，二者皆无才报错。
- 基线应用：pnpm 用 `pnpm install --frozen-lockfile --config.minimumReleaseAge=0`，npm 维持 `npm ci`。
- 构建与测试：pnpm 用 `pnpm run build-storybook` / `pnpm exec playwright`，npm 维持 `npm run` / `npx`。
- 指纹改为所选锁文件内容的哈希。

## Validation

- `make preflight`；pnpm 消费端 `verify_fidelity.py` 能建立基线并通过比对。
