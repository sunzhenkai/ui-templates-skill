## Context

The current source staging gate has a portable-package fast path, while `design-system/v1/layout.yaml` records slots and breakpoints as prose strings. The structural fidelity sidecar already has stronger topology semantics, but it is optional and is not required for page-system publication. On the Apply side, route validation checks that a Page Type exists, and component validation checks that stable references resolve, but neither enforces a route-to-layout-to-pattern authorization closure.

This change therefore spans the portable contract, shared validation, Authoring staging, Apply state, bundled distribution, and deterministic evals. It must not turn one observed product page into a template rule.

## Goals / Non-Goals

**Goals:**

- Introduce one reusable placement model shared by Authoring evidence, portable layout, Active Instance consumption, validation, and verification.
- Close the Generate-from-source gate so package format does not disable source capture and replay.
- Make placement authorization an ID-based closure rather than a natural-language inference.
- Preserve source-blind Apply: placement checks consume only the Active Instance, structured Apply artifacts, and current-build evidence.
- Keep existing `legacy-baseline` packages portable while making their structural guarantees explicitly unavailable.

**Non-Goals:**

- Do not add a business-page, product-name, route-name, or framework-specific rule to the template contract.
- Do not create an eighth portable layer or a runnable implementation starter.
- Do not make Apply read source history, provenance checkouts, or oracle output.
- Do not retroactively rewrite immutable archives or automatically promote an upgraded published package.
- Do not use pixel-perfect equality as the acceptance model; token-referenced topology and pattern equivalence remain the contract.

## Decisions

### 1. Add portable topology inside the layout layer

Extend `design-system/v1/layout.yaml` with an optional structured `placement` model rather than introducing a new layer. The model should support:

- stable scene IDs;
- stable region/slot IDs and semantic roles;
- `contains`, peer ordering, nesting, and overlay relations;
- scroll ownership by region;
- responsive modes;
- references from a scene to applicable Page Type and Pattern IDs;
- token references for quantitative geometry such as insets, gutters, or widths.

String `slots` and `breakpoints` remain valid as human-readable supplementary data, preserving existing portable packages. New page-system source imports must populate the structured model or fail placement closure.

Alternative considered: require every package to carry the existing structural `fidelity.yaml`. That was rejected as the sole portable mechanism because fidelity evidence and provenance should remain separate from the reusable semantic topology that Apply consumes.

### 2. Treat structural fidelity as source evidence, not portable identity

For Generate-from-source, the capture profile remains the source-direct evidence and replay mechanism. When capture produces structural placement facts, Authoring must map them into stable layout/Page Type/Pattern identities and evidence. The candidate `fidelity.yaml`, when present, must match the generated canonical profile; unresolved structural facts block page-system publication.

This keeps portable topology reusable and source-blind after adoption, while still proving that it was not invented during generation.

### 3. Make the staging gate capture-first for every contract family

Reorder the Authoring gate so a `design-system/v1` manifest no longer causes an early portable-only return. For Generate-from-source:

1. capture twice from the declared session source;
2. compare canonical receipts;
3. generate the structural profile for structural conformance;
4. verify chrome/scene closure and unresolved facts;
5. compare the candidate profile with the generated profile;
6. replay observed records against the same session source;
7. run package validation and eval;
8. only then consider INDEX promotion.

The report should preserve `capture`, `reproducibility`, `replay`, `validation`, and `eval` as distinct gates. A package candidate can never produce a successful report with `capture: not-run` merely because portable validation passed.

The design-system validator remains responsible for portable package validity. Source replay may be performed by the shared fidelity implementation already bundled with Authoring; it does not require Apply to access source history.

### 4. Use explicit placement roles, not prose classification

Apply Phase 2 route records gain stable fields for:

- `layout_ref`;
- `page_type`;
- `pattern_refs`;
- placement plan;
- scroll ownership;
- responsive degradation;
- structural verification availability.

Phase 4 component records gain explicit placement bindings for placement-sensitive uses, including the route, semantic role, and authorizing Pattern/Page Type closure. A component's global presence in the Active Instance is not authorization.

To avoid keyword inference, a component is placement-sensitive only when its structured record declares a placement role from the route/pattern topology or a generic closed role vocabulary. The vocabulary should remain generic (for example shell, content region, section navigation, toolbar, overlay, master/detail, floating surface), never a product or page name.

### 5. Fail closed without breaking portable legacy consumption

Validator changes are backward-compatible at the package schema level, but stricter at capability and workflow level:

- existing published packages without structured placement remain readable as degraded packages;
- Apply must record structural verification as unavailable for such packages;
- Apply must not convert their prose slots into machine constraints;
- new page-system Generate-from-source requires full placement closure or an explicit capability downgrade;
- resuming an older Apply session with incomplete placement artifacts reopens the affected Phase 2/4 flow and marks downstream evidence stale.

The preferred remedy for an existing template is an Authoring candidate upgrade with new evidence, not editing a generated consumer application.

### 6. Centralize stable findings and bundle parity

Use stable validator/checker codes for:

- source capture or replay missing;
- structural placement closure incomplete;
- topology reference dangling or duplicate;
- relation/order or scroll-owner mutation;
- route layout/Page Type/Pattern binding missing or unauthorized;
- placement-sensitive component use unauthorized;
- structural assertion while fidelity is unavailable.

Repository validation and installed-bundle validation must share schemas and implementation. Distribution governance must fail if the bundle can only reproduce the checks from a repository checkout or discovery wrapper.

## Risks / Trade-offs

- [Stricter gates reject previously plausible Apply sessions] → Recovery reopens the earliest affected phase and generates package feedback; degraded packages remain consumable without pretending profile verification.
- [Topology schema can grow into framework-specific markup] → Keep roles semantic, relations abstract, selectors/framework classes out of core, and quantitative values behind tokens or structural profiles.
- [Overblocking generic controls] → Authorization is required only when a structured placement role is declared; ordinary component reuse within a declared Pattern remains valid.
- [Authoring capture may produce complete facts but no reusable identity] → The gate treats this as an unresolved placement and requires a candidate decision, not silent generalization.
- [Breaking source-import behavior for prose page-system packages] → This is intentional; the migration path is explicit capability downgrade or completing structural closure.

## Migration Plan

1. Add optional topology fields and shared validator support with fixtures.
2. Add Apply route/component placement fields and checker findings, with resume behavior that reopens affected phases.
3. Reorder Authoring staging so package candidates execute source capture, closure checks, and replay.
4. Add deterministic repository and installed-mode evals.
5. Sync skill references, schemas, bundled runtime manifests, release compatibility, and derived documentation.
6. Run the fixed governance tests and template validators; do not promote an upgraded published package in this change without separate user confirmation.

Rollback restores the previous portable-package fast path and optional placement fields. Existing degraded Active Instances remain readable, but any artifacts created under the stricter closure should be revalidated before resuming.

## Open Questions

None. Compatibility is intentionally stricter for new Generate-from-source page-system imports, while existing portable packages remain consumable with explicit structural degradation.
