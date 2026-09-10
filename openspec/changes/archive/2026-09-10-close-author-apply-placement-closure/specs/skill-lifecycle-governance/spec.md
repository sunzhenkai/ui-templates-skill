## ADDED Requirements

### Requirement: Placement closure runtime distribution
The Author and Apply public bundle distribution SHALL include the schemas, shared validator implementation, Apply placement-closure checker logic, and deterministic fixtures/resources needed to validate placement topology and route closure in installed mode. Repository-only discovery wrappers SHALL NOT satisfy the distribution contract.

#### Scenario: Installed skill validation
- **WHEN** a consumer project invokes Author or Apply placement gates without the repository checkout
- **THEN** the bundled shared implementation validates the same stable fields and error codes as repository validation

#### Scenario: Missing bundled capability
- **WHEN** the bundle lacks a placement schema, checker, fixture, or shared validator dependency
- **THEN** bundle governance fails and the release is not promoted

### Requirement: Placement closure governance evals
Governance contract evals SHALL include deterministic Author and Apply cases for the generic placement contract. Evals SHALL count declared, parsed, and executed cases and SHALL fail on missing execution, unstable findings, example-based evidence, or source/oracle leakage into Apply.

#### Scenario: Negative evals block release
- **WHEN** a placement topology, source gate, route closure, or structural-availability mutation does not produce its expected stable failure
- **THEN** governance eval fails and production INDEX remains unchanged

#### Scenario: Generic fixture coverage
- **WHEN** contract evals run
- **THEN** positive and negative placement cases use stable semantic roles and fixtures that do not depend on `example/**`, a consumer application, or historical generated web output
