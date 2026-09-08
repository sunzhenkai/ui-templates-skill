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

`bootstrap` may build the Active Instance once from a `published` frozen package:

```bash
python3 skills/ui-template-apply/runtime/adopt_package.py \
  --package <published-package> --design-root .ui-template-design \
  --output-root app --language typescript --ui-framework react --styling tailwind \
  --component-system shadcn
```

Adoption is copy-only: never rewrite package semantic identity, stable IDs, core values or gallery coverage. Project choices belong in `binding.yaml`.

## Increment and recovery

Checkpoint uses Impact-based Resume. It records `design-system-apply-checkpoint/v1` and records mode, change set, contract/binding/projection digests, stable IDs, output root, build identity and evidence. Resolve reopen scope:

```bash
python3 skills/ui-template-apply/runtime/check_apply_resume.py .ui-template-apply/checkpoint.yaml --design-root .ui-template-design --json
```

Any digest mismatch blocks selective continuation and reopens all phases. Otherwise only dependent phases reopen; undeclared paths remain original bytes.

## Vendor loading

Resolve allowed references from the user-confirmed binding:

```bash
python3 skills/ui-template-apply/runtime/resolve_vendor_refs.py --binding .ui-template-design/binding.yaml --vendor-manifest skills/ui-template-apply/references/vendor/vendor.yaml --json
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
