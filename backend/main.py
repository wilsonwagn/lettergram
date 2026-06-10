"""
LetterGram API — Entry point.
Inicia o servidor FastAPI com CORS aberto para o app mobile.
"""
import sys
from pathlib import Path

# Garante que o diretório backend/ está no sys.path,
# necessário para a Vercel (que executa a partir da raiz do projeto).
_backend_dir = str(Path(__file__).resolve().parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import router as api_router

app = FastAPI(title="LetterGram API")

# CORS aberto para permitir requests do Expo (dev) e qualquer frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
