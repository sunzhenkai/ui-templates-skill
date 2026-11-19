# 更新 LogView 的 registry 哈希

- target: skills/ui-template-apply
- mode: update
- patch: 20261119-200200-log-view-registry
- risk: low
- status: proposed

## Intent

`20261119-193500-state-matrix` 改了 `library/blocks/log-view.tsx`。registry 由文件哈希和 import 生成，需要跟上新的 sha256，并记上对 `blocks/use-container-width` 的依赖。

## Conflict check

none。只改生成物 `library/registry.json` 里 `blocks/log-view` 一项。配套 patch：`20261119-193500-state-matrix`。

## Rationale

`scripts/build_registry.py --check` 会因哈希过期失败。不手改其它 item。

## Files

- skills/ui-template-apply/library/registry.json：log-view 的 sha256 与 registryDependencies

## Validation

- 应用前：`git apply --check --recount`
- 应用后：`python3 scripts/build_registry.py --check`
