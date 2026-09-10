## ADDED Requirements

### Requirement: Route placement artifact closure
Apply Phase 2 SHALL record the layout scene, Page Type, applicable Pattern closure, placement plan, scroll owner, and structural verification availability for each included route. Phase 4 SHALL bind each placement-sensitive component use to the route closure and its applicable semantic role. A route SHALL NOT enter implementation with a missing or unresolved binding.

#### Scenario: Route plan validation
- **WHEN** Phase 2 declares a complete route placement closure
- **THEN** all layout, Page Type, Pattern, and Primitive references resolve in the Active Instance

#### Scenario: Placement-sensitive component
- **WHEN** Phase 4 places a component into a navigation, chrome, inset, overlay, section, or other placement-sensitive role
- **THEN** the record cites the authorized route closure and stable placement role, not merely global component existence

#### Scenario: Invalid route recovery
- **WHEN** a route binding is missing or references an ID outside its Page Type closure
- **THEN** checkpoint recovery reopens the affected route phase and marks downstream evidence stale

### Requirement: Degraded structural placement honesty
When structural fidelity is unavailable, Apply SHALL preserve style and component capability from the Active Instance but SHALL label placement verification unavailable and SHALL NOT create machine chrome topology, shell variant, slot order, or profile-verified claims from supplementary prose.

#### Scenario: Legacy package adoption
- **WHEN** Apply adopts a package whose structural fidelity is unavailable
- **THEN** Phase 2 records structural placement gates as unavailable and Phase 8 does not report profile verification

#### Scenario: Prose upgraded to constraint
- **WHEN** an Apply artifact converts an unstructured layout note into an ordered chrome or topology assertion
- **THEN** Apply state validation fails and requires either removal of the assertion or a template upgrade through Authoring
