## ADDED Requirements

### Requirement: Source gate applies to design-system packages
Generate-from-source staging SHALL execute deterministic capture, reproducibility comparison, source replay when structural conformance is claimed, and validation for every candidate, including a candidate that already has a `design-system/v1` manifest. Candidate format SHALL NOT change the staging gate from a source gate into a portable-only shortcut.

#### Scenario: Package candidate without source graph
- **WHEN** a structural Generate-from-source request is run against a `design-system/v1` candidate and its required source graph cannot produce complete capture
- **THEN** the gate fails with capture findings, replay is not reported as passed, and production INDEX remains unchanged

#### Scenario: Portable-looking shortcut
- **WHEN** a Generate-from-source request supplies a valid package candidate, session source, and request, but the candidate lacks structural evidence required by the request
- **THEN** the gate reports that capture or structural closure was not completed and SHALL NOT return `capture: not-run` as success

### Requirement: Page-system structural placement publication
Authoring SHALL publish a page-system package from source only when its included scene closure has complete structural placement evidence, stable reusable identities, resolvable evidence, and a passing source replay. If placement evidence cannot be closed, Author SHALL either leave the candidate unpublished or change the candidate to an explicitly declared lower capability with the degradation recorded.

#### Scenario: Complete page-system candidate
- **WHEN** captured scenes include topology, reusable placement identities, evidence, and replay passes
- **THEN** the candidate may proceed to portable validation and the normal publication gates

#### Scenario: Missing placement closure
- **WHEN** an observed arrangement cannot be represented by stable topology, Pattern/Page Type identity, or evidence
- **THEN** the candidate cannot be published as page-system and the unresolved placement is returned for review or explicit capability downgrade

#### Scenario: Silent capability retention
- **WHEN** a candidate lacks structural placement evidence but its manifest remains page-system
- **THEN** publication fails closed rather than inheriting placement behavior from prose or implementation defaults
