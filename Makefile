PYTHON ?= python3

.PHONY: check test names registry catalog sync validate preflight

# Everything CI runs. No network, no browser required (browser/lint tests skip when unavailable).
check: names registry catalog test

test:
	$(PYTHON) -m unittest discover -s tests -v

names:
	$(PYTHON) scripts/check_no_project_names.py

registry:
	$(PYTHON) scripts/build_registry.py --check

catalog:
	$(PYTHON) scripts/sync_catalog.py --check

# Regenerate derived files after editing library/ or templates/.
sync:
	$(PYTHON) scripts/build_registry.py
	$(PYTHON) scripts/sync_catalog.py

# Package validation for every bundled style package.
validate:
	$(PYTHON) skills/ui-template-apply/scripts/validate_package.py package skills/ui-template-apply/catalog/quiet-inset
	$(PYTHON) skills/ui-template-apply/scripts/validate_package.py package skills/ui-template-apply/catalog/workbench-shell

# Pre-release gate: regenerate derived files first, then run every check.
# Run it directly — piping it (e.g. `make preflight | tail`) masks the exit code.
preflight: sync check validate
