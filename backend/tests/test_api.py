"""
Testes da API do LetterGram.
Usa TestClient do FastAPI para testar rotas sem iniciar servidor.
"""
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_read_root():
    """Health check: API deve retornar mensagem de status."""
    response = client.get("/")
    assert response.status_code == 200
    assert "LetterGram API" in response.json()["message"]


def test_extract_valid_review():
    """Testa extração de review real do Wilson (Marty Supreme)."""
    url = "https://letterboxd.com/wilsonwagn/film/marty-supreme/"
    response = client.get(f"/api/extract?url={url}")
    assert response.status_code == 200
    data = response.json()
    assert "Marty Supreme" in data["movieTitle"]
    assert data["username"] == "wilsonwagn"
    assert "stars" in data
    assert "posterUrl" in data


def test_extract_invalid_url():
    """URLs fora do Letterboxd devem retornar 400."""
    url = "https://google.com"
    response = client.get(f"/api/extract?url={url}")
    assert response.status_code == 400
    assert "não parece ser uma página válida do Letterboxd" in response.json()["detail"]
