## 1. Scope Guard and Reproducible Tooling

- [x] 1.1 Add one repository governance scope configuration that lists active/release paths, immutable history paths, and the exact exclusion `example/workbench-shell/web-v2/**`; add a test that the three domains do not overlap unexpectedly.
- [x] 1.2 Record a pre-implementation hash/status baseline for `example/workbench-shell/web-v2/**` and add a final guard command that fails if this change modifies any file under that path.
- [x] 1.3 Add an exact-version governance dependency file for PyYAML and JSON Schema validation, document licenses and purposes, and verify a clean environment can install it reproducibly.
- [x] 1.4 Add a root test layout for schema, validator, migrator, feedback/checkpoint, eval, bundle and mirror fixtures without importing any web-v2 files.

## 2. Template Schema v2

- [x] 2.1 Create shared JSON Schema Draft 2020-12 definitions for schema version, semantic versions, closed enums, token paths, rule IDs, timestamps, digests and finding identities.
- [x] 2.2 Create `meta.schema.json` with `schema_version: 2`, `template_version`, `sources[]`, confidence dimensions, platforms and mutually exclusive observed/defaulted/unsupported coverage for viewports, themes, page modes, components and states.
- [x] 2.3 Create `tokens.schema.json` so every consumable leaf has non-empty `value`, valid four-value origin and a required unit for dimensional numeric values; cover compound list/map values without bare-leaf bypasses.
- [x] 2.4 Create `evidence.schema.json` for token/default/asset evidence, source revision and locator, status/supersedes, confidence, license, redistribution and redaction fields.
- [x] 2.5 Create feedback, checkpoint and verification schemas with closed status/phase values, UUID/fingerprint, canonical digest metadata, source/build identity and evidence references.
- [x] 2.6 Create `skills-manifest.schema.json` for bundle/skill/schema versions, allowlisted files, SHA-256, generator identity and license records.
- [x] 2.7 Add good and bad schema fixtures for unknown versions/origins, bare leaves, missing units, coverage overlap, invalid evidence, illegal state transitions and malformed manifests; assert stable schema errors.

## 3. Fail-closed Validator

- [x] 3.1 Refactor `scripts/validate_templates.py` into a reusable validation package while preserving a single documented CLI entry and aggregate-all-findings behavior.
- [x] 3.2 Implement safe YAML/JSON loading, JSON Schema dispatch by declared version and stable findings with code, severity, path, message and details.
- [x] 3.3 Implement token/evidence path resolution, theme-role equality, coverage completeness/exclusivity, confidence and asset provenance checks.
- [x] 3.4 Implement self-contained parsers and standard test vectors for `#RRGGBB`, `#RRGGBBAA`, opaque `oklch()` and alpha `oklch()`, including conversion tolerance and invalid syntax failures.
- [x] 3.5 Implement background-aware alpha composition, canonical/contextual text pairs, real-surface destructive pairs, focus-ring non-text 3:1 and checked/failed/skipped/waived counters.
- [x] 3.6 Make every unparseable or background-less required pair fail; implement expiring rule-ID waivers and tests proving zero checked pairs cannot return success.
- [x] 3.7 Implement stable rule-ID parsing and cross-reference checks for `spec.md`, split design docs, `apply/`, verification and feedback.
- [x] 3.8 Implement INDEX/meta field equality, active-path relative links, required `apply/playbook.md`, precision-value duplication checks and recursive prohibited engineering-content checks.
- [x] 3.9 Add stable `--json` output and exit-code tests; verify human and JSON modes report the same findings in deterministic order.
- [x] 3.10 Add mutation fixtures for low-contrast OKLCH, alpha failure, dangling IDs, missing evidence, bad INDEX, copied values in `apply/`, nested stack adapter and zero-pair themes; require nonzero exits and expected finding codes.

## 4. v1 to v2 Migration and Workbench Template

- [x] 4.1 Implement a non-destructive v1→v2 migrator that writes a candidate directory and converted/inferred/unresolved/breaking report instead of replacing the source.
- [x] 4.2 Implement deterministic leaf wrapping, source-list conversion, evidence/coverage skeleton generation and stable initial rule-ID allocation; prove repeat runs are idempotent.
- [x] 4.3 Run the migrator against `templates/workbench-shell`, resolve every report item only from its template source/meta/spec history, and do not read web-v2 as a source of decisions.
- [x] 4.4 Convert workbench tokens and meta to v2 with explicit units, four-value origins, source revisions, confidence dimensions, complete coverage and template version.
- [x] 4.5 Add complete `evidence.yaml` for workbench tokens/default decisions and any distributable assets, including license/redistribution/privacy decisions.
- [x] 4.6 Add stable IDs to workbench Non-negotiables and all cross-referenced layout, route, accessibility, responsive and quality rules; update references without reusing retired IDs.
- [x] 4.7 Validate the migrated workbench template in human and JSON modes, assert nonzero contrast checks for every theme, and retain the migration report as auditable evidence.

## 5. Authoring Contract and Workflow

- [x] 5.1 Update `skills/ui-template/references/spec-format.md` to define schema v2, `evidence.yaml`, rule IDs, coverage, units, `apply/` ownership and explicit removal of `implementation/`/stack/project engineering content.
- [x] 5.2 Update all four source guides to produce source/locator/confidence evidence, asset license/privacy decisions and default bases without weakening source-specific extraction behavior.
- [x] 5.3 Update `skills/ui-template/SKILL.md` to enforce Generate → Validate → Eval → Index → Report and to prohibit INDEX/completion updates after any failed gate.
- [x] 5.4 Define Authoring feedback discovery, accepted/known-gap/rejected/applied/verified transitions, UUID/fingerprint idempotency and terminal receipts in the production skill references.
- [x] 5.5 Add portable validator/eval invocation guidance so an installed Authoring skill enforces the same gate without relying on this repository's `AGENTS.md`.
- [x] 5.6 Align project `ui-template-manager` production instructions with schema v2 and the Authoring/Apply handoff while keeping it a repository-only thin wrapper.

## 6. Apply Contract, Artifacts, and Recovery

- [x] 6.1 Update `ui-template-apply` consumption contract to reject unsupported schemas and unknown origins and to consume only `source | computed | estimated | default` as deterministic values.
- [x] 6.2 Update Apply phases 0–9 to require the standard `.ui-template-apply/` artifact tree and coverage decisions before implementation begins.
- [x] 6.3 Implement canonical sorted-JSON SHA-256 digest utilities and checkpoint validation for template/token/artifact/source/build identities.
- [x] 6.4 Implement recovery decisions for changed scope, token drift, missing artifacts and stale Phase 8 evidence; add fixtures proving the earliest correct phase is reopened.
- [x] 6.5 Define and validate structured Phase 8 verification and Phase 9 review records, including rule IDs, expected/actual, route, viewport, theme, state, revision, build and re-check results.
- [x] 6.6 Update `toolchain.md` with the one-intent, explicit mode, 2–5 term, top-identity, retry-once, abstain and default no-persist Query Contract for `ui-ux-pro-max`.
- [x] 6.7 Update quality gates and reporting requirements to use current-build evidence and stable rule IDs rather than fixed checklist counts or prose-only completion claims.
- [x] 6.8 Implement feedback record creation/merge validation using UUID plus normalized content fingerprint; prove repeated discovery merges evidence without duplicate records.

## 7. Workbench Design and Apply Alignment

- [x] 7.1 Update workbench active template docs to the A constant collection, B master/detail, C settings tabs, D chat/timeline and E aggregate-grid model; map legacy document-detail use to B or explicit exclusion.
- [x] 7.2 Align all workbench responsive docs to expanded `>=1280`, collapsed `1024–1279` and overlay `<1024` Web behavior while preserving separate Mobile/Desktop platform paths.
- [x] 7.3 Resolve focus-ring, source description, mobile exact-color and duplicated precision-value conflicts so tokens remain the only exact-value carrier.
- [x] 7.4 Rewrite `templates/workbench-shell/apply/` to map template steps onto generic Phase 0–9 and reference rule IDs/check methods only, with no framework, dependency, directory, API/mock or copied value content.
- [x] 7.5 Update workbench component, route and quality documents to use v2 evidence/rule references and current token-declared scale rather than “nine/ten” hard-coded counts.
- [x] 7.6 Run prohibited-content, dangling-reference, active-link and template validator checks over workbench and prove no task in this section changed web-v2.

## 8. Executable Contract Evals

- [x] 8.1 Define the eval case schema and result schema with id, skill, category, fixture, `judge: script | llm`, expectation, revision, fixture hash and runtime fingerprint.
- [x] 8.2 Migrate the current nine Authoring and eight Apply cases without rewriting historical patch results; require declared = parsed = executed and unique IDs.
- [x] 8.3 Implement script judges and fixtures for routing, schema, origin, validation gate, feedback states, checkpoint recovery, installation and prohibited content.
- [x] 8.4 Add fixed fixtures/rubrics for remaining LLM cases and a result adapter that never sends project code or user data unless separately authorized.
- [x] 8.5 Implement JSON and JUnit output, locked deterministic baselines and nonzero exits for parse/count/judge failures.
- [x] 8.6 Add tests that intentionally break one script case, one fixture hash and one result count and prove each blocks promotion.

## 9. Bundle, Install, Mirror, and Release Metadata

- [x] 9.1 Define production-file allowlists for both public skills and explicit exclusions for manager, OpenSpec project skills, patches, experience and repository-only files.
- [x] 9.2 Add bundle/skill/schema version metadata, establish the initial documented SemVer baseline, and create CHANGELOG plus compatibility/migration entries for schema v2.
- [x] 9.3 Implement a reproducible sorted tar builder with normalized timestamps/ownership, generated manifest, per-file SHA-256, license inventory and artifact checksum.
- [x] 9.4 Build the same revision twice and add a test that manifest/file digests are identical; inject a non-allowlisted `ui-ux-pro-max` data file and prove bundle validation fails.
- [x] 9.5 Implement the two-directory staging/backup/atomic installer, rollback on verification failure and protection for unrelated skills.
- [x] 9.6 Add empty-project install, stale-managed-file removal, checksum failure and rollback smoke tests; verify Authoring and Apply trigger/resources after install.
- [x] 9.7 Implement production mirror `--check`/`--write` using the same allowlist, staging replacement and separate historical archive policy.
- [x] 9.8 Add drift tests for changed production reference, removed source file and history-only difference; only the first two shall fail production equality.

## 10. Active Documentation, Root Commands, and CI

- [x] 10.1 Rewrite root README around the dual-skill product, bundle installation, schema v2, current `apply/` path, validation, migration and release compatibility; remove active `implementation/` claims.
- [x] 10.2 Update AGENTS with current repository/tooling facts, authoritative source boundaries, exact governance commands and correct workbench provenance without changing immutable history.
- [x] 10.3 Replace the single-skill Makefile install target with root bootstrap/validate/bundle/install/mirror/eval targets that call the canonical scripts and preserve unrelated skills.
- [x] 10.4 Add an active/release link and semantic consistency checker for README, AGENTS, active OpenSpec, production skills, templates and release metadata; apply the shared immutable-history and web-v2 exclusions.
- [x] 10.5 Add a sample promotion command/report schema that requires tracked revision and declared gates but does not promote or edit web-v2 or web-v3 in this change.
- [x] 10.6 Add governance CI for schemas/fixtures, validator, OpenSpec strict, active links, evals, bundle/install/rebuild and mirror drift using the pinned environment.
- [x] 10.7 Prove CI configuration and root validation do not read, execute or modify `example/workbench-shell/web-v2/**` and report the exclusion explicitly.

## 11. Final Verification and Release Readiness

- [x] 11.1 Run all schema, validator, migrator, checkpoint, feedback, eval, bundle, installer, mirror and active-document tests from a clean governance environment.
- [x] 11.2 Run `openspec validate --all --strict` and validate this change after implementation-facing documents and generated mirrors are synchronized.
- [x] 11.3 Run the migrated real `workbench-shell` through schema/semantic/contrast validation in human and JSON modes and archive nonzero checked-pair evidence.
- [x] 11.4 Build the bundle twice, compare checksums, install it into a temporary empty project, run both trigger/resource smokes, then test rollback with a corrupted artifact.
- [x] 11.5 Run production mirror drift and active/release link checks, confirming archives remain unchanged and separately classified.
- [x] 11.6 Compare the final web-v2 path hash/status with task 1.2 and fail completion if any file under `example/workbench-shell/web-v2/**` changed or any web-v2 test was made a gate.
- [x] 11.7 Produce the implementation verification summary, migration guide, compatibility matrix, accepted non-goals and rollback instructions; do not publish, tag, archive the OpenSpec change or start sample promotion without a separate request.
