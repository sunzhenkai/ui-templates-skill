PYTHON ?= python3
GOVERNANCE_VENV ?= /tmp/ui-template-governance-venv
GOVERNANCE_PYTHON ?= $(GOVERNANCE_VENV)/bin/python
REPORT_DIR ?= governance-reports
DIST_DIR ?= dist
PROMOTE_NAME ?= workbench-shell

.PHONY: bootstrap validate test eval bundle promote

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
	"$(GOVERNANCE_PYTHON)" scripts/run_design_system_evals.py \
		--json-out "$(REPORT_DIR)/design-system-eval.json"

bundle:
	"$(GOVERNANCE_PYTHON)" scripts/manage_skill_distribution.py build --output-dir "$(DIST_DIR)"

# candidate → templates → author catalog 晋级链；catalog --write 自带认证门禁。
promote:
	"$(GOVERNANCE_PYTHON)" scripts/promote_candidate.py --name "$(PROMOTE_NAME)"
	"$(GOVERNANCE_PYTHON)" scripts/manage_skill_distribution.py catalog --write
	"$(GOVERNANCE_PYTHON)" scripts/manage_skill_distribution.py catalog --check
