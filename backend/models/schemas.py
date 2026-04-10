from pydantic import BaseModel
from typing import Optional, List


# ── Review (existing) ──────────────────────────────────────────────────
class ReviewResponse(BaseModel):
    movieTitle: str
    reviewText: str
    stars: float
    username: str
    posterUrl: str
    posterBase64: str = ""
    avatarBase64: str = ""
    originalUrl: str


# ── Profile ────────────────────────────────────────────────────────────
class FavoriteFilm(BaseModel):
    title: str
    year: Optional[int] = None
    posterUrl: str = ""
    posterBase64: str = ""


class DiaryEntry(BaseModel):
    date: str = ""
    movieTitle: str
    year: Optional[int] = None
    stars: float = 0.0
    posterUrl: str = ""
    posterBase64: str = ""
    reviewUrl: str = ""
    letterboxdUri: str = ""


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


# ── Diary ──────────────────────────────────────────────────────────────
class DiaryResponse(BaseModel):
    username: str
    page: int
    entries: List[DiaryEntry] = []
