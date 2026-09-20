# Active Instance implementation and vendor gates

Apply never treats a template, catalog checkout, prompt, sibling app or historical page as implementation truth. A session has one of:

```yaml
mode: bootstrap | increment
```

## Active truth gate

Before writing business code, validate:

```bash
python3 skills/ui-template-apply/runtime/check_active_instance.py validate .ui-template-design --kind active --json
```

安装态无仓库 `scripts/` 时，wrapper 启动同目录 `shared_validate_design_system.py`。`UI_DESIGN_SYSTEM_VALIDATOR` 只能指向该共享实现；指向 Apply 或 Author 的 discovery wrapper 会以 `VALIDATOR_SELF_INVOCATION` 失败并停止实施。

`bootstrap` may build the Active Instance once from a `published` frozen package:

```bash
python3 skills/ui-template-apply/runtime/adopt_package.py \
  --package <published-package> --design-root .ui-template-design \
  --output-root app --language typescript --ui-framework react --styling tailwind \
  --component-system shadcn
```

Adoption is copy-only: never rewrite package semantic identity, stable IDs, core values, fidelity observations or gallery coverage. Copy an existing package `fidelity.yaml` unchanged when present. Project choices belong in `binding.yaml`.

## Increment and recovery

Checkpoint uses Impact-based Resume. It records `design-system-apply-checkpoint/v1` and records mode, change set, contract/binding/projection digests, stable IDs, output root, build identity and evidence. 新会话骨架用 `checkpoint-init` 生成（用法见 [apply-workflow.md](apply-workflow.md)「checkpoint 与身份」），不手写。Resolve reopen scope:

```bash
python3 skills/ui-template-apply/runtime/check_apply_resume.py .ui-template-apply/checkpoint.yaml --design-root .ui-template-design --json
```

The checkpoint `template.digest` MUST bind canonical JSON of the package meta plus the unchanged fidelity profile when one exists. Any template, contract, binding, projection or fidelity digest mismatch blocks selective continuation and reopens all phases. Otherwise only dependent phases reopen; undeclared paths remain original bytes.

### Identity / digest 对照表

字段名都叫 digest，取值来源不同；填错会在 verification/checkpoint 门禁 fail closed：

| 字段 | 位置 | 取值与计算式 |
| --- | --- | --- |
| `template.digest` | checkpoint | `sha256-canonical-json-v1` over `{template: <meta.yaml 解析值>, fidelity: <fidelity.yaml 解析值>}`；无 sidecar 时只对 meta。校验器即按此重算比对 |
| `template_digest` | 08-verification / 09-review | 必须与上面 checkpoint `template.digest` **同值**（同一 `{algorithm, value}` 对象，不是字符串） |
| `contract.digest` / `contract_digest` | checkpoint / design-system.yaml | manifest 声明的 `contract_digest`（七层 core 的契约摘要）；**不等于** template digest，不要互相代填 |
| `binding_digest` | checkpoint / binding.yaml | `binding.yaml` 自带字段，adopt 后原样读取，不重算 |
| `source_identity` | checkpoint / verification | `git:<commit>:clean` 或 `git:<commit>:dirty:<payload-sha>`，由 `source-identity` 子命令输出；是身份**字符串**，不是 digest 对象 |
| `build_identity` | checkpoint / verification | `build:<sha>`，由 `build-identity` 子命令对实际构建命令 + 产物树计算；必须非空可复现，不得写 "latest" |
| `template.fidelity` | checkpoint `template` 内层 | 字符串 profile 名（`repo-structural-v1`、`legacy-baseline`、`style-only`、`unknown`），不是对象；与 checkpoint 顶层 `fidelity` 对象（measured expectation 比对状态）是两个字段，不要互相代填 |
| `.md` artifact digest | checkpoint `artifacts[].digest` / `digest` 子命令 | Markdown 以换行归一（`\r\n`→`\n`）文本作 `{"media_type": "text/markdown", "text": …}` envelope 参与 canonical；`digest` 子命令对 `.md`/`.yaml`/`.json` 均与该口径一致 |

## Vendor loading

Resolve allowed references from the user-confirmed binding:

```bash
python3 skills/ui-template-apply/runtime/resolve_vendor_refs.py --binding .ui-template-design/binding.yaml --vendor-manifest skills/ui-template-apply/references/vendor/vendor.yaml
```

Rules:

- `frontend-design` loads for visual direction.
- `shadcn` loads only for `stack.component_system == shadcn`.
- Tailwind implementation patterns load only for `stack.styling == tailwind`.
- `tailwind-design-system` (Tailwind v4 design-system/token projection guidance) loads only for Tailwind v4.
- Do not preload unmatched vendors, download upstream files at runtime, or edit third-party snapshots.
- Source, revision, license and file hashes are pinned in `references/vendor/vendor.yaml`; details are in `references/vendor/UPSTREAM.md`.

## Feedback ownership

Phase 9 uses one closed ownership enum:

- `package`: portable core gap; emit `design-system-feedback/v1` to Author.
- `binding`: project stack/path/projection mistake; fix only with explicit user-confirmed binding change.
- `apply-skill`: workflow/gate defect; route back to this skill, not to generated pages.
