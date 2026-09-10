## Purpose

Define the template-technology-independent contract that turns observed spatial arrangements into stable, reusable placement topology and authorizes every placement-sensitive implementation choice through that topology.

## Requirements

### Requirement: Generic placement topology
A reusable UI template SHALL represent placement as stable regions, slots, roles, containment or peer relations, sibling order, nesting, scroll ownership, and responsive modes. Roles SHALL describe semantic function rather than a product, route, business entity, framework element, or literal selector. Quantitative geometry SHALL remain referenced to token paths; prose alone SHALL NOT be the authority for a machine-verified placement constraint.

#### Scenario: Content-local section navigation
- **WHEN** a source scene contains a section navigation surface inside the content region and before the section content
- **THEN** the extracted topology records the content region, the navigation role, containment or peer relation, relative order, and evidence without inventing a page-specific rule

#### Scenario: Inset content region
- **WHEN** a source shell places the content as an inset surface with its own scroll domain
- **THEN** the topology records the shell-to-content relation, content scroll ownership, and referenced geometry tokens without copying framework class names

#### Scenario: Prose-only page-system input
- **WHEN** a page-system source import provides only prose layout and cannot derive complete topology, stable identities, and evidence
- **THEN** the import fails placement closure or records an explicit capability downgrade; it SHALL NOT be published as structurally complete

### Requirement: Placement authorization closure
A placement-sensitive semantic role SHALL be authorized by a closure of Page Type, Pattern, Primitive, and resolvable evidence in the Active Instance. Presence of a globally declared Primitive SHALL NOT authorize its use in an undeclared placement role. Local project placement decisions MAY add session-scoped constraints but SHALL NOT replace a missing reusable authorization.

#### Scenario: Unrelated control reuse
- **WHEN** an implementation uses a declared control in a semantic placement role for which no applicable Pattern or topology binding exists
- **THEN** placement validation fails and requires a package update or an explicit session-scoped decision before the route can complete

#### Scenario: Reusable placement is absent
- **WHEN** a route requires a reusable arrangement that is absent from the template
- **THEN** Apply blocks that reusable layer and emits package feedback with stable semantic identity and evidence references instead of silently choosing another control

### Requirement: Route placement binding
Every included route SHALL bind to a declared layout scene, declared Page Type, and the applicable Pattern closure used by that route. Every stable reference SHALL resolve in the Active Instance, and a Pattern reference SHALL belong to the bound Page Type or an explicitly declared compatible composition.

#### Scenario: Complete route closure
- **WHEN** Apply plans a route with a declared layout scene, Page Type, patterns, primitives, and placement plan
- **THEN** all references resolve and the route may proceed to implementation

#### Scenario: Missing placement binding
- **WHEN** a route lacks a layout binding, uses an unknown stable ID, or uses a Pattern outside its Page Type closure
- **THEN** the route fails before implementation and recovery reopens the earliest affected phase

### Requirement: Unavailable structural fidelity
When a consumed template declares structural fidelity unavailable, Apply MAY consume tokens, primitives, patterns, and rules within their declared capability, but SHALL mark machine layout/profile verification unavailable. It SHALL NOT assert shell variant, ordered chrome slots, scroll ownership, region topology, or profile verification derived from prose.

#### Scenario: Legacy baseline consumption
- **WHEN** Apply adopts a published package without structural fidelity
- **THEN** Phase 2 records structural verification as unavailable and does not synthesize ordered chrome constraints

#### Scenario: Machine assertion without profile
- **WHEN** an Apply artifact contains ordered chrome slots, shell variant, or topology constraints while structural fidelity is unavailable
- **THEN** validation fails and the artifact must be corrected or the template upgraded through the Authoring flow

### Requirement: Source-blind placement validation
Apply placement checks SHALL consume only the digest-consistent Active Instance, declared binding, structured Apply artifacts, and current-build evidence. Original source trees, source provenance paths, historical generated web output, and oracle comparisons SHALL NOT enter Apply placement validation.

#### Scenario: Alignment request
- **WHEN** a user asks Apply to align a generated page with its original source
- **THEN** Apply still validates only the Active Instance and current build, while source alignment remains an Authoring or certification workflow

#### Scenario: Oracle input detected
- **WHEN** an Apply placement artifact references a source oracle, source comparison, or historical generated implementation
- **THEN** validation reports a source-blind violation and blocks completion
