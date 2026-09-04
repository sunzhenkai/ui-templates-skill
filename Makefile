PYTHON ?= python3
GOVERNANCE_VENV ?= /tmp/ui-template-governance-venv
GOVERNANCE_PYTHON ?= $(GOVERNANCE_VENV)/bin/python
REPORT_DIR ?= governance-reports
DIST_DIR ?= dist
MIRROR_TARGET ?= .agents/skills

export ARTIFACT
export CHECKSUM
export INSTALL_TARGET

.PHONY: bootstrap validate test eval bundle install mirror-check mirror-write

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

install:
	@set -eu; \
	: "$${ARTIFACT:?set ARTIFACT to a verified ui-templates-skill bundle}"; \
	: "$${INSTALL_TARGET:?set INSTALL_TARGET to the target skills parent directory}"; \
	case "$${INSTALL_TARGET}" in /|.|..) echo "unsafe INSTALL_TARGET: $${INSTALL_TARGET}" >&2; exit 2;; esac; \
	if [ -n "$${CHECKSUM:-}" ]; then \
		"$(GOVERNANCE_PYTHON)" scripts/manage_skill_distribution.py install \
			"$${ARTIFACT}" --checksum "$${CHECKSUM}" --target "$${INSTALL_TARGET}"; \
	else \
		"$(GOVERNANCE_PYTHON)" scripts/manage_skill_distribution.py install \
			"$${ARTIFACT}" --target "$${INSTALL_TARGET}"; \
	fi

mirror-check:
	"$(GOVERNANCE_PYTHON)" scripts/manage_skill_distribution.py mirror --check --target "$(MIRROR_TARGET)"

mirror-write:
	"$(GOVERNANCE_PYTHON)" scripts/manage_skill_distribution.py mirror --write --target "$(MIRROR_TARGET)"
