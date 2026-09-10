## 1. Contract and fixtures

- [x] 1.1 Extend the `design-system/v1` layout schema with optional machine-readable placement scenes, regions, slots, semantic roles, relations, sibling order, nesting, scroll ownership, responsive modes, token-referenced geometry, and Page Type/Pattern composition references while preserving existing string fields.
- [x] 1.2 Add generic positive fixtures for shell inset topology, content-local section navigation, nested scroll domains, and responsive degradation without product, route-name, or framework-specific identities.
- [x] 1.3 Add generic negative fixtures for dangling/duplicate stable IDs, invalid relations, missing evidence, unauthorized Pattern/Page Type composition, and unavailable-profile assertions.
- [x] 1.4 Verify that existing `design-system/v1` fixtures and published portable packages remain schema-compatible when structured placement is absent.

## 2. Shared placement validation

- [x] 2.1 Extend the shared design-system validator to parse structured placement, enforce stable-ID and evidence closure, and report aggregated stable findings with paths and details.
- [x] 2.2 Add capability-aware validation so page-system publication inputs require closed structured placement or an explicit declared downgrade rather than prose-only layout.
- [x] 2.3 Add deterministic unit tests for valid topology, dangling references, duplicate IDs, relation/order mutation, scroll-owner mutation, evidence failure, and capability mismatch.
- [x] 2.4 Keep quantitative geometry under token references and reject a second exact-value authority or framework/source selector semantics in portable placement fields.

## 3. Authoring source gate

- [x] 3.1 Reorder the Generate-from-source staging gate so `design-system/v1` candidates execute capture, reproducibility comparison, structural closure, source replay, package validation, and eval before any promotion path.
- [x] 3.2 Preserve distinct gate results for capture, reproducibility, replay, validation, eval, and INDEX promotion; a package candidate must not return successful `capture: not-run` for source import.
- [x] 3.3 Map captured structural placement facts to stable layout, Page Type, Pattern, Primitive, and evidence identities, and fail unresolved page-system closure or require an explicit capability downgrade.
- [x] 3.4 Compare candidate structural placement evidence with the generated canonical capture profile and fail on missing, stale, partially copied, or self-referential provenance.
- [x] 3.5 Add staging-gate tests using a `design-system/v1` candidate for both complete closure and the bypass regression where portable validation would previously pass.
- [x] 3.6 Sync `ui-template-author` references and reporting language for source gates, page-system structural requirements, explicit downgrades, and honest unavailable evidence.

## 4. Apply placement closure

- [x] 4.1 Extend Phase 2 route artifacts with stable layout, Page Type, Pattern closure, placement plan, scroll owner, responsive degradation, and structural verification availability fields.
- [x] 4.2 Extend Phase 4 component artifacts with explicit route, semantic placement role, and authorizing Pattern/Page Type closure for placement-sensitive uses.
- [x] 4.3 Extend Apply state validation to resolve all route and component placement references, enforce Page Type authorization, and report stable missing/unauthorized findings.
- [x] 4.4 Block machine shell variant, ordered chrome slot, scroll-owner, topology, or profile-verified assertions whenever consumed structural fidelity is unavailable.
- [x] 4.5 Update checkpoint recovery so invalid placement closure reopens the earliest affected Phase 2/4 artifact and marks downstream browser evidence stale.
- [x] 4.6 Add regression tests proving that a declared component used in an undeclared placement role fails and that complete route-to-pattern closure passes.
- [x] 4.7 Preserve source-blind validation and ensure no placement checker consumes source trees, provenance paths, oracle comparisons, or historical generated output.
- [x] 4.8 Sync `ui-template-apply` Phase 2, Phase 4, Phase 8, checkpoint, and feedback guidance with the generic placement-closure contract.

## 5. Evals and distribution

- [x] 5.1 Add deterministic Author and Apply contract-eval cases for source-gate bypass, complete closure, topology mutation, unauthorized placement, and unavailable-profile assertion.
- [x] 5.2 Ensure eval cases use generic semantic fixtures, stable codes, nonzero failure exits, and declared/parsed/executed count integrity without `example/**` or historical web output.
- [x] 5.3 Update bundle manifests and distribution allowlists so installed Author/Apply modes include the placement schemas, shared validator implementation, Apply checker logic, and fixture/resources needed for parity.
- [x] 5.4 Add installed-mode tests proving bundled validation produces the same verdicts and finding codes as repository validation.

## 6. Governance, documentation, and release gates

- [x] 6.1 Update release compatibility, migration/rollback notes, dependency documentation if needed, and derived skill documentation for the new placement-closure behavior.
- [x] 6.2 Run the fixed governance environment for `make test`, `make eval`, and `make validate`; require all new deterministic tests to pass.
- [x] 6.3 Run real template package and Active Instance validators over applicable fixtures; do not use generated sample-web tests as contract evidence.
- [x] 6.4 Run `openspec validate --all --strict` and confirm the production INDEX digest remains unchanged by this change.
- [x] 6.5 Stop before publishing, tagging, archiving, or promoting any upgraded published package; record that separate user confirmation is required for promotion.
