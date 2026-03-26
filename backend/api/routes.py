from fastapi import APIRouter
from services.scraper_service import extract_letterboxd_review
from models.schemas import ReviewResponse

router = APIRouter()

@router.get("/extract", response_model=ReviewResponse)
def extract_review(url: str):
    """
    Rota que invoca o serviço de scraping do Letterboxd repassado para a service logic layer.
    """
    return extract_letterboxd_review(url)
