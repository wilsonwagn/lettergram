import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert "LetterGram API" in response.json()["message"]

def test_extract_valid_review():
    # Testando com a review do Wilson (Marty Supreme)
    url = "https://letterboxd.com/wilsonwagn/film/marty-supreme/"
    response = client.get(f"/api/extract?url={url}")
    assert response.status_code == 200
    data = response.json()
    assert "Marty Supreme" in data["movieTitle"]
    assert data["username"] == "wilsonwagn"
    assert "stars" in data
    assert "posterUrl" in data

def test_extract_invalid_url():
    url = "https://google.com"
    response = client.get(f"/api/extract?url={url}")
    # Agora garantimos que caminhos inválidos retornam exatamente 400
    assert response.status_code == 400
    assert "não parece ser uma página válida do Letterboxd" in response.json()["detail"]
