from pydantic import BaseModel

class ReviewResponse(BaseModel):
    movieTitle: str
    reviewText: str
    stars: float
    username: str
    posterUrl: str
    posterBase64: str = ""
    avatarBase64: str = ""
    originalUrl: str
