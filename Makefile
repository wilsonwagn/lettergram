SHELL := /bin/bash
GREEN := \033[0;32m
RESET := \033[0m

.PHONY: backend app web setup

setup:
	sudo apt install -y python3.12-venv
	cd backend && python3 -m venv venv && venv/bin/pip install -r requirements.txt

backend:
	@[ -f backend/venv/bin/python ] || $(MAKE) setup
	@echo -e "$(GREEN)http://localhost:8000$(RESET)"
	cd backend && venv/bin/python main.py

app:
	@echo -e "$(GREEN)Expo Go — escaneie o QR$(RESET)"
	cd mobile && npx expo start

web:
	@echo -e "$(GREEN)http://localhost:8081$(RESET)"
	cd mobile && npx expo start --web
