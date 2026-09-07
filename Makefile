PYTHON ?= python3
GOVERNANCE_VENV ?= /tmp/ui-template-governance-venv
GOVERNANCE_PYTHON ?= $(GOVERNANCE_VENV)/bin/python
REPORT_DIR ?= governance-reports
DIST_DIR ?= dist

.PHONY: bootstrap validate test eval bundle

bootstrap:
	$(PYTHON) -m venv "$(GOVERNANCE_VENV)"
	"$(GOVERNANCE_PYTHON)" -m pip install -r governance/requirements-governance.txt

validate:
	@mkdir -p "$(REPORT_DIR)"
	"$(GOVERNANCE_PYTHON)" scripts/run_governance_validation.py --report-dir "$(REPORT_DIR)"

test:
	"$(GOVERNANCE_PYTHON)" -m unittest discover -s tests -v

eval:
	@mkdir -p "$(REPORT_DIR)"
	"$(GOVERNANCE_PYTHON)" scripts/run_contract_evals.py \
		--json-out "$(REPORT_DIR)/eval.json" \
		--junit-out "$(REPORT_DIR)/eval.xml"

bundle:
	"$(GOVERNANCE_PYTHON)" scripts/manage_skill_distribution.py build --output-dir "$(DIST_DIR)"
