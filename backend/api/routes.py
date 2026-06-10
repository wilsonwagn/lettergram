"""
Rotas REST da API do LetterGram.
Cada rota delega para um service isolado (scraper, profile).
"""
from fastapi import APIRouter
from services.scraper_service import extract_letterboxd_review
from services.profile_service import (
    scrape_profile,
    scrape_diary,
)
from models.schemas import ReviewResponse, ProfileResponse, DiaryResponse

router = APIRouter()


@router.get("/extract", response_model=ReviewResponse)
def extract_review(url: str):
    """Extrai dados de uma review individual do Letterboxd (poster, nota, texto, etc)."""
    return extract_letterboxd_review(url)


@router.get("/profile/{username}", response_model=ProfileResponse)
def get_profile(username: str):
    """Scraping do perfil público: stats, avatar, favoritos e atividade recente."""
    return scrape_profile(username)


@router.get("/diary/{username}", response_model=DiaryResponse)
def get_diary(username: str, page: int = 1):
    """Retorna uma página do diário (até 28 entradas). Use ?page= para paginar."""
    return scrape_diary(username, page)
