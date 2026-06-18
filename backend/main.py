"""
LetterGram API — Entry point.
Inicia o servidor FastAPI com CORS restrito e rate limiting.
"""
import os
import sys
import logging
from pathlib import Path

# Garante que o diretório backend/ está no sys.path,
# necessário para a Vercel (que executa a partir da raiz do projeto).
_backend_dir = str(Path(__file__).resolve().parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from api.routes import router as api_router

# ── Logging ──────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── Rate Limiter ─────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

# ── App ──────────────────────────────────────────────────────
app = FastAPI(title="LetterGram API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ─────────────────────────────────────────────────────
# Em produção: apenas domínios autorizados
# Em dev (variável DEV=1 ou __DEV__): qualquer origem
IS_DEV = os.getenv("DEV", "").strip() == "1" or os.getenv("VERCEL_ENV") == "development"

ALLOWED_ORIGINS = [
    "https://lettergram.vercel.app",
    "https://www.lettergram.vercel.app",
    "http://localhost:8081",   # Expo dev
    "http://localhost:19006",  # Expo web
    "http://localhost:8000",   # API dev
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if IS_DEV else ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    """Health check — confirma que a API está rodando."""
    return {"message": "LetterGram API is running. Acesse /docs para ver a documentação."}


# Rotas da API sob prefixo /api
app.include_router(api_router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    # Auto-reload ativado para desenvolvimento
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
