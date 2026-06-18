"""
Rotas REST da API do LetterGram.
Cada rota delega para um service isolado (scraper, profile).
Rate limiting aplicado para proteger contra abuso.
"""
from fastapi import APIRouter, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from services.scraper_service import extract_letterboxd_review
from services.profile_service import (
    scrape_profile,
    scrape_diary,
)
from models.schemas import ReviewResponse, ProfileResponse, DiaryResponse

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.get("/extract", response_model=ReviewResponse)
@limiter.limit("15/minute")
def extract_review(request: Request, url: str):
    """Extrai dados de uma review individual do Letterboxd (poster, nota, texto, etc)."""
    return extract_letterboxd_review(url)


@router.get("/profile/{username}", response_model=ProfileResponse)
@limiter.limit("10/minute")
def get_profile(request: Request, username: str):
    """Scraping do perfil público: stats, avatar, favoritos e atividade recente."""
    return scrape_profile(username)


@router.get("/diary/{username}", response_model=DiaryResponse)
@limiter.limit("20/minute")
def get_diary(request: Request, username: str, page: int = 1):
    """Retorna uma página do diário (até 28 entradas). Use ?page= para paginar."""
    return scrape_diary(username, page)
