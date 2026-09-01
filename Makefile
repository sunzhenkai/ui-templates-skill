SKILL_NAME := ui-template
SKILL_SRC := skills/$(SKILL_NAME)
INSTALL_DIR := .agents/skills/$(SKILL_NAME)

.PHONY: install-project
install-project:
	@mkdir -p $(INSTALL_DIR)
	@cp -r $(SKILL_SRC)/. $(INSTALL_DIR)/
	@echo "$(SKILL_NAME) installed to $(INSTALL_DIR)"
