## ADDED Requirements

### Requirement: Placement closure validation
The shared package and Active Instance validators SHALL validate machine placement topology, stable-ID references, Page Type authorization, route closure, scroll ownership, responsive mode, evidence resolvability, and structural availability in one aggregated result. A placement error SHALL produce a stable code, path, and details, and SHALL fail the target with a nonzero result.

#### Scenario: Valid closure
- **WHEN** a page-system package and an Apply route both declare complete topology and reusable identity closure
- **THEN** validation passes and reports nonzero placement-closure counts or coverage

#### Scenario: Dangling or unauthorized placement
- **WHEN** a topology, route, Pattern, Primitive, or evidence reference is missing, duplicated, or outside its Page Type closure
- **THEN** validation fails with a stable placement-closure finding

#### Scenario: Unavailable profile assertion
- **WHEN** structural fidelity is unavailable but structured Apply data asserts ordered chrome, shell variant, scroll ownership, or topology constraints
- **THEN** validation fails with a stable unavailable-profile finding

### Requirement: Placement mutation and eval coverage
Contract evals SHALL execute deterministic positive and negative cases that are expressed by generic semantic roles rather than product-specific pages. Coverage SHALL include source-gate bypass, missing structural placement closure, topology relation/order mutation, route-to-pattern closure failure, unauthorized placement-sensitive control reuse, and unavailable-profile assertion.

#### Scenario: Source gate bypass regression
- **WHEN** a structural Generate-from-source candidate is presented through the package path without required source closure
- **THEN** the staged gate fails and does not report capture or replay as successful

#### Scenario: Placement mutation
- **WHEN** an eval swaps peer order, removes a containment relation, changes scroll ownership, or replaces an authorized placement role with an unrelated declared control
- **THEN** the corresponding stable finding appears and the command exits nonzero

#### Scenario: Bundled runtime parity
- **WHEN** placement-closure validation runs from the installed Author/Apply bundle rather than a repository checkout
- **THEN** it produces the same deterministic verdicts using bundled schemas and runtimes
