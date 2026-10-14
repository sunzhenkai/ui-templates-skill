PYTHON ?= python3

.PHONY: check test names registry catalog sync

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
