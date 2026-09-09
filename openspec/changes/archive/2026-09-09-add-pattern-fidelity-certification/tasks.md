## 1. Fidelity certification contract

- [x] 1.1 Add `design-system-fidelity-certification/v1` JSON Schema for gate runs and Pattern Equivalence Records, including package/build/oracle identity, route/composition, state, theme, viewport, verdict, assertions and evidence refs.
- [x] 1.2 Extend the shared design-system validator to validate certification reports with fail-closed identity, digest, evidence-path and verdict checks.
- [x] 1.3 Add valid and invalid fixtures for missing record, stale build identity, screenshot-only evidence, failed assertion and passed equivalence.
- [x] 1.4 Add contract evals proving report schema stability and fail-closed behavior across installed and repo-root validator discovery paths.

## 2. Derived Component Family

- [x] 2.1 Implement Page Type → Pattern → Primitive closure derivation over Stable Entity IDs for `ui-kit` and `page-system` packages.
- [x] 2.2 Validate closure references, duplicate IDs, evidence resolution and capability adequacy without adding an eighth package layer.
- [x] 2.3 Report family members, dangling targets and unresolved evidence in structured validator output.
- [x] 2.4 Add fixtures for a valid page-system closure, dangling pattern, missing evidence, over-fragmented candidate member and capability mismatch.

## 3. Source-blind Apply boundary

- [x] 3.1 Remove `Mode A / Mode B` wording and source-compare mode entries from `skills/ui-template-apply/`, keeping only `bootstrap | increment`.
- [x] 3.2 Update Apply validation so oracle identity, source-compare implementation input or historical generated output cannot enter an Apply checkpoint.
- [x] 3.3 Enforce Pattern-bound route composition evidence: included routes map to declared page types and resolve all referenced patterns/primitives.
- [x] 3.4 Add evals for original-alignment handoff, source-compare rejection, missing reusable control feedback and valid pattern-bound implementation.
- [x] 3.5 Preserve normal Phase 0–9 behavior for projects that do not run certification.

## 4. Template Certification Gate

- [x] 4.1 Add a governance certification runner that accepts fixed oracle revision, candidate package, fixed prompts digest and explicit clean output root.
- [x] 4.2 Execute source-blind Apply from the runner and fail on any attempt to pass oracle paths or prior generated output into implementation.
- [x] 4.3 Derive a source-aware certification inventory with replayable oracle provenance and compare it against the candidate Component Family closure.
- [x] 4.4 Produce machine-readable pass/fail results plus failed ownership classification: `package | apply-skill | certification-prompt`.
- [x] 4.5 Block reuse of patched prior output by requiring a fresh build identity and clean regeneration after any writeback.
- [x] 4.6 Add governance documentation and release checks that official package publish/upgrade requires a current accepted certification report.

## 5. Workbench-shell candidate upgrade

- [x] 5.1 Freeze the certification source revision, fixed workbench prompts and candidate scope without storing local absolute paths in the package.
- [x] 5.2 Convert the existing prose component inventory into Primitive / Pattern / Page Type candidates at Fidelity Granularity, covering navigation, workspace switching, search, creation, forms, tables, pagination, badges, tabs, board columns/cards, service cards, calendar cards, stat cards, chart legends, avatars, empty states, skeletons, toasts, confirmations, dialogs, menus, tooltips and icon buttons.
- [x] 5.3 Add token refs, rule refs, states, variants, responsive behavior, accessibility semantics and evidence for every new family member.
- [x] 5.4 Reconcile `core/layout.yaml`, `core/rules.yaml`, `core/evidence.yaml`, playbook guidance and package manifest version/digests.
- [x] 5.5 Validate the upgraded candidate with package, closure and existing structural validators; keep production `templates/` and Author catalog unchanged until certification and explicit user promotion.

## 6. Governance and derived documentation

- [x] 6.1 Update `governance/FUNCTIONAL-LOOP.md`, AGENTS instructions and README terminology for source-blind Apply, certification gate, Visual Equivalence and derived Component Family.
- [x] 6.2 Update Author and Apply skill transfer/boundaries so original-alignment requests route to template certification, not an Apply oracle mode.
- [x] 6.3 Add release compatibility or migration notes for sessions that previously relied on Apply source-compare mode.

## 7. Full acceptance

- [x] 7.1 Run `make bootstrap`.
- [x] 7.2 Run `make validate`.
- [x] 7.3 Run `make test`.
- [x] 7.4 Run `make eval`.
- [x] 7.5 Run `openspec validate --all --strict`.
- [x] 7.6 Complete one clean source-blind certification regeneration for the upgraded workbench candidate and retain machine-readable evidence outside `example/**`.
- [x] 7.7 Confirm production catalog promotion, tagging and OpenSpec archive remain separate user-requested actions.
