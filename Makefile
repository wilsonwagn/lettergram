# ────────────────────────────────────────────────
#  LetterGram — Makefile (Simplificado para WSL)
# ────────────────────────────────────────────────

.PHONY: backend app web setup install test clean help

VENV_DIR      := backend/venv
PY            := $(VENV_DIR)/bin/python
PYTHON_SYSTEM := python3

# ── Targets ──────────────────────────────────────

help: ## Mostra todos os comandos disponíveis
	@echo ""
	@echo "  LetterGram - Comandos disponíveis (WSL/Linux):"
	@echo "  ──────────────────────────────────────────────"
	@echo "  make setup    → Cria venv e instala dependências Python"
	@echo "  make install  → Instala dependências do mobile (npm)"
	@echo "  make backend  → Inicia a API FastAPI (porta 8000)"
	@echo "  make app      → Inicia o Expo Go (QR code)"
	@echo "  make web      → Inicia o Expo para browser"
	@echo "  make test     → Roda testes do backend (pytest)"
	@echo "  make clean    → Remove caches e arquivos temporários"
	@echo ""

setup: ## Cria virtualenv e instala deps Python
	rm -rf $(VENV_DIR)
	@echo "→ Criando venv (--without-pip para velocidade no WSL)..."
	$(PYTHON_SYSTEM) -m venv --without-pip $(VENV_DIR)
	@echo "→ Instalando pip via ensurepip..."
	PIP_NO_COMPILE=1 $(PY) -m ensurepip --default-pip
	PIP_NO_COMPILE=1 $(PY) -m pip install --upgrade pip --no-compile
	@echo "→ Instalando dependências do backend..."
	PIP_NO_COMPILE=1 $(PY) -m pip install -r backend/requirements.txt --no-compile
	@echo "✓ Setup completo!"

install: ## Instala deps do mobile (npm)
	cd mobile && npm install

backend: ## Inicia API na porta 8000 (auto-reload)
	@echo "→ http://localhost:8000/docs"
	cd backend && venv/bin/python main.py

app: ## Abre Expo Go (escaneie o QR)
	cd mobile && npx expo start

web: ## Abre Expo no browser
	cd mobile && npx expo start --web --clear

test: ## Roda pytest no backend
	cd backend && venv/bin/python -m pytest tests/ -v

clean: ## Limpa caches e __pycache__
	find backend -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	rm -rf backend/.pytest_cache
	@echo "✓ Caches removidos"
