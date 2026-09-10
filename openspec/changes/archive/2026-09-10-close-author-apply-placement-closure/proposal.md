## Why

`design-system/v1` Generate-from-source currently treats a package candidate as a portable-validation shortcut, so source capture, replay, and structural coverage can be skipped before publication. At the same time, Apply does not require routes to be bound to declared layout topology and reusable patterns, allowing components to be placed by convenience rather than by contract.

The observed result is structural drift: inset shell geometry and content-local section navigation can disappear or be replaced by an unrelated control without an Authoring or Apply gate failing. The fix must be generic placement-closure machinery, not source-specific page rules.

## What Changes

- Require every Generate-from-source run—regardless of template contract family—to execute the deterministic source-capture and reproducibility path before portable validation and promotion.
- Make structural placement evidence a required publication input for page-system capability: either complete structural fidelity and scene closure, or an explicit, validated capability downgrade; prose-only layout cannot satisfy page-system source import.
- Extend portable layout semantics with a generic region/slot topology that can express containment, peer order, nesting, scroll ownership, responsive mode, and content-local navigation without naming specific products, pages, or business entities.
- Require Authoring to attach newly observed placement arrangements to stable Pattern/Page Type identities and evidence before page-system publication.
- Require Apply to record route → layout → page-type → pattern closure, and fail when a placement-sensitive component is not authorized by that closure.
- Prevent Apply from asserting machine chrome/layout constraints when the consumed package declares structural fidelity unavailable.
- Add deterministic validator and contract-eval coverage for source-gate bypass, topology mutations, placement closure failures, and unavailable-profile assertions.

## Capabilities

### New Capabilities

- `design-system-placement-closure`: the cross-cutting contract for generic layout topology, placement authorization, and route-to-pattern closure consumed by Authoring, Apply, validation, and eval.

### Modified Capabilities

- `design-system-authoring`: Generate-from-source must no longer bypass source capture for `design-system/v1` package candidates, and page-system publication requires closed structural placement evidence or explicit downgrade.
- `design-system-contract`: `design-system/v1` portable layout must carry machine-readable topology and placement bindings while preserving stable IDs, token authority, and source-blind Apply.
- `design-system-implementation`: Active Instance Apply must validate placement closure and refuse to derive undeclared chrome geometry or placement-sensitive component arrangements.
- `template-contract-validation`: validator and contract eval must verify topology, scene closure, source replay, Apply placement bindings, and unavailable-profile constraints.
- `skill-lifecycle-governance`: bundled Author/Apply runtimes must keep the placement-closure checks available and deterministic contract evals must exercise the generic positive and negative cases.

## Impact

- Production skills: `skills/ui-template-author/` and `skills/ui-template-apply/`.
- Shared contracts and validators: `schemas/design-system/v1/`, shared design-system validator, Authoring capture/gate code, Apply checkpoint/runtime checks, and bundled validator mirrors.
- Structured Apply artifacts: Phase 2 route records, Phase 4 component inventory, checkpoint stable-ID/identity data, and Phase 8 verification expectations.
- Published package governance: existing `legacy-baseline` packages remain consumable only with degraded structural guarantees; new page-system Generate-from-source without structural placement closure fails closed or must be explicitly downgraded before publication.
- No generated consumer application is in scope, and no implementation may read source history or oracle builds during Apply.
