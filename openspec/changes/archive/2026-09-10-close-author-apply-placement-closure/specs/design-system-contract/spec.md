## ADDED Requirements

### Requirement: Machine-readable portable placement topology
The portable layout layer SHALL be able to declare stable scene, region, slot, semantic role, relation, sibling order, nesting, scroll ownership, and responsive mode fields for capabilities that claim page placement. It SHALL also be able to bind a placement arrangement to stable Page Type and Pattern identities. Human-readable labels and breakpoints SHALL remain supplementary and SHALL NOT be the sole authority for these semantics.

#### Scenario: Topology declaration
- **WHEN** a page-system layout declares a content-local navigation arrangement
- **THEN** stable IDs resolve across layout, Page Type, Pattern, and evidence, and the relation identifies containment or peer order without a product-specific name

#### Scenario: Quantitative placement geometry
- **WHEN** placement requires an inset, gutter, width, or other quantitative value
- **THEN** the topology references a token path or structural profile value and does not introduce a second exact-value authority

#### Scenario: Stable identity preservation
- **WHEN** a published package is adopted into an Active Instance
- **THEN** placement scene, region, slot, Page Type, Pattern, and Primitive stable IDs are preserved and validated against the same digest-consistent contract
