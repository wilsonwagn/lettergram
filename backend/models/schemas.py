"""
Schemas Pydantic — define os modelos de resposta da API.
Cada campo opcional tem default vazio para evitar erros de serialização.
"""
from pydantic import BaseModel
from typing import Optional, List


# ── Review (extração de uma review individual) ─────────────────────────
class ReviewResponse(BaseModel):
    movieTitle: str          # título do filme
    reviewText: str          # texto completo da review
    stars: float             # nota em estrelas (0.0 a 5.0)
    username: str            # autor da review
    posterUrl: str            # URL original do poster
    posterBase64: str = ""   # poster convertido em base64 (evita CORS)
    avatarBase64: str = ""   # avatar do autor em base64
    originalUrl: str         # link original da review


# ── Profile ────────────────────────────────────────────────────────────
class FavoriteFilm(BaseModel):
    title: str
    year: Optional[int] = None
    posterUrl: str = ""
    posterBase64: str = ""


class DiaryEntry(BaseModel):
    date: str = ""            # data em formato YYYY-MM-DD
    movieTitle: str
    year: Optional[int] = None
    stars: float = 0.0
    posterUrl: str = ""
    posterBase64: str = ""
    reviewUrl: str = ""
    letterboxdUri: str = ""   # link completo no Letterboxd


class ProfileResponse(BaseModel):
    username: str
    displayName: str
    avatarUrl: str = ""
    avatarBase64: str = ""
    bio: str = ""
    totalFilms: int = 0
    totalThisYear: int = 0
    followers: int = 0
    following: int = 0
    favoriteFilms: List[FavoriteFilm] = []
    recentActivity: List[DiaryEntry] = []


# ── Diary (paginado) ──────────────────────────────────────────────────
class DiaryResponse(BaseModel):
    username: str
    page: int
    entries: List[DiaryEntry] = []
