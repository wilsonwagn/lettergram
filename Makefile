SHELL := /bin/bash
GREEN := \033[0;32m
RESET := \033[0m

.PHONY: backend app web setup

VENV := $(HOME)/.venvs/lettergram

setup:
	python3 -m venv $(VENV)
	$(VENV)/bin/pip install -r backend/requirements.txt

backend:
	@[ -f $(VENV)/bin/python ] || $(MAKE) setup 
	@echo -e "$(GREEN)http://localhost:8000$(RESET)"
	cd backend && $(VENV)/bin/python main.py

app:
	@echo -e "$(GREEN)Expo Go — escaneie o QR$(RESET)"
	cd mobile && npx expo start

web:
	@echo -e "$(GREEN)http://localhost:8081$(RESET)"
	cd mobile && npx expo start --web
