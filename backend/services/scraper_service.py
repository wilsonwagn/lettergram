"""
Scraper de reviews individuais do Letterboxd.
Recebe a URL de uma review e retorna título, nota, texto, poster e avatar.
Usa requests + BeautifulSoup para parsing do HTML.
"""
import logging
import requests
import base64
import re
from io import BytesIO
from urllib.parse import urlparse
from bs4 import BeautifulSoup
from fastapi import HTTPException
from models.schemas import ReviewResponse

logger = logging.getLogger(__name__)

# Domínios permitidos para download de imagens (proteção SSRF)
ALLOWED_IMAGE_DOMAINS = {
    'letterboxd.com',
    'a.ltrbxd.com',         # CDN de avatares
    's.ltrbxd.com',         # CDN de posters
    'image.tmdb.org',       # TMDB (posters)
    'www.gravatar.com',     # Avatares Gravatar
    'secure.gravatar.com',
}

# Tamanho máximo da imagem para compressão (largura em px)
POSTER_MAX_WIDTH = 600
AVATAR_MAX_WIDTH = 200


def _is_allowed_image_url(url: str) -> bool:
    """Valida que a URL da imagem é de um domínio permitido (proteção SSRF)."""
    try:
        parsed = urlparse(url)
        hostname = (parsed.hostname or "").lower().lstrip("www.")
        return any(hostname == d or hostname.endswith("." + d) for d in ALLOWED_IMAGE_DOMAINS)
    except Exception:
        return False


def _download_image_as_base64(session: requests.Session, url: str, max_width: int = POSTER_MAX_WIDTH) -> str:
    """
    Baixa imagem, comprime com Pillow se disponível, e retorna como data URI base64.
    Se Pillow não estiver instalado, retorna a imagem original.
    Mantém boa qualidade (85%) para downloads.
    """
    if not url or not _is_allowed_image_url(url):
        if url:
            logger.warning(f"URL de imagem bloqueada (SSRF): {url}")
        return ""
    try:
        r = session.get(url, timeout=8)
        if r.status_code != 200:
            logger.warning(f"Erro ao baixar imagem: status {r.status_code} - {url}")
            return ""

        image_data = r.content
        content_type = r.headers.get('content-type', 'image/jpeg')

        # Tenta comprimir com Pillow (se disponível)
        try:
            from PIL import Image as PILImage
            img = PILImage.open(BytesIO(image_data))

            # Redimensiona se maior que max_width mantendo proporção
            if img.width > max_width:
                ratio = max_width / img.width
                new_size = (max_width, int(img.height * ratio))
                img = img.resize(new_size, PILImage.LANCZOS)

            # Salva como JPEG com boa qualidade
            output = BytesIO()
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')
            img.save(output, format='JPEG', quality=85, optimize=True)
            image_data = output.getvalue()
            content_type = 'image/jpeg'
        except ImportError:
            pass  # Pillow não instalado — usa imagem original

        encoded = base64.b64encode(image_data).decode('utf-8')
        return f"data:{content_type};base64,{encoded}"
    except Exception as e:
        logger.error(f"Erro ao converter imagem: {type(e).__name__} - {e}")
        return ""


def extract_letterboxd_review(url: str) -> ReviewResponse:
    """
    Scraping completo de uma review do Letterboxd.
    Extrai: título do filme, texto da review, estrelas, poster (base64) e avatar.
    """
    logger.info(f"Iniciando scraping de: {url}")

    # Garante protocolo https
    if not url.startswith("http"):
        url = "https://" + url

    # ── Validação: aceita apenas links do Letterboxd (ou boxd.it encurtados) ──
    parsed = urlparse(url)
    hostname = (parsed.hostname or "").lower().lstrip("www.")
    if hostname not in ("letterboxd.com", "boxd.it"):
        raise HTTPException(
            status_code=400,
            detail="Apenas links do Letterboxd são aceitos. Use URLs do tipo letterboxd.com/... ou boxd.it/..."
        )

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://letterboxd.com/'
    }

    # Sessão persistente mantém cookies entre requests (evita bloqueios)
    session = requests.Session()
    session.headers.update(headers)

    try:
        response = session.get(url, allow_redirects=True, timeout=10)
        response.raise_for_status()
        logger.info(f"Página carregada ({len(response.text)} bytes)")
    except Exception as e:
        logger.error(f"Erro ao acessar URL: {type(e).__name__} - {e}")
        raise HTTPException(
            status_code=400, detail=f"Erro ao acessar URL do Letterboxd: {str(e)}")

    # Valida URL final (após seguir redirects de boxd.it etc)
    final_parsed = urlparse(str(response.url))
    final_hostname = (final_parsed.hostname or "").lower().lstrip("www.")
    if final_hostname != "letterboxd.com":
        raise HTTPException(
            status_code=400,
            detail="O link fornecido não redireciona para o Letterboxd. Apenas links do Letterboxd são aceitos."
        )

    soup = BeautifulSoup(response.text, 'html.parser')

    # Valida se é uma página do Letterboxd
    if "Letterboxd" not in soup.get_text():
        raise HTTPException(
            status_code=400, detail="A URL fornecida não parece ser uma página válida do Letterboxd.")

    try:
        # ── Título do filme ──────────────────────────────────
        og_title = soup.find("meta", property="og:title")
        title_raw = og_title["content"] if og_title else ""

        # Remove prefixos como "A ★★★★ review of", "username's review of" ou "diary entry for"
        movie_title = re.sub(r'^.*?\b(review\s+of|diary\s+entry\s+for)\s+', '',
                             title_raw, flags=re.IGNORECASE | re.UNICODE)
        movie_title = movie_title.split(" - ")[0].strip()

        # Fallback se o regex não limpou tudo
        if "review of " in movie_title.lower():
            movie_title = movie_title.lower().split("review of ")[-1].capitalize()
        elif "diary entry for " in movie_title.lower():
            movie_title = movie_title.lower().split("diary entry for ")[-1].capitalize()

        # ── Texto da review ──────────────────────────────────
        review_div = soup.find("div", class_="review bodytext")
        review_text = ""
        if review_div:
            paragraphs = review_div.find_all("p")
            review_text = "\n\n".join([p.get_text() for p in paragraphs])
        else:
            # Fallback: usa og:description
            og_desc = soup.find("meta", property="og:description")
            fallback_text = og_desc["content"] if og_desc else ""
            
            # Limpa textos genéricos do Letterboxd para diários sem review
            # Ex: "A ★★★½ diary entry for Send Help" ou "Watched on..."
            is_generic = re.match(r'^(A\s+)?(★+½?\s+)?(diary entry for|review of)\s+', fallback_text, flags=re.IGNORECASE) or \
                         re.match(r'^Watched on\s+', fallback_text, flags=re.IGNORECASE)
            
            if is_generic:
                if ":" in fallback_text:
                    # Se tiver ":", a review de verdade costuma estar depois
                    review_text = fallback_text.split(":", 1)[1].strip()
                else:
                    review_text = ""
            else:
                review_text = fallback_text

        # ── Nota em estrelas ─────────────────────────────────
        rating_span = soup.find("span", class_="rating")
        stars = 0.0
        if rating_span:
            text_rating = rating_span.get_text()
            stars += text_rating.count("★")
            if "½" in text_rating:
                stars += 0.5

        # Fallback 1: qualquer span com 'rating' na classe
        if stars == 0.0:
            all_rating_spans = soup.find_all("span", class_=lambda c: c and "rating" in c.lower())
            for span in all_rating_spans:
                t = span.get_text()
                if "★" in t:
                    stars = t.count("★") + (0.5 if "½" in t else 0)
                    break

        # Fallback 2: estrelas no og:description
        if stars == 0.0:
            og_desc_meta = soup.find("meta", property="og:description")
            if og_desc_meta:
                desc_text = og_desc_meta.get("content", "")
                if "★" in desc_text:
                    stars = desc_text.count("★") + (0.5 if "½" in desc_text else 0)
                    logger.info(f"Estrelas extraídas do og:description: {stars}")

        # ── Autor da review ──────────────────────────────────
        author = ""
        avatar_base64 = ""
        author_span = soup.find("span", itemprop="name")
        if author_span:
            author = author_span.get_text()

        # Avatar do autor (converte para base64 para evitar CORS no app)
        avatar_link = soup.find("a", class_="avatar")
        if avatar_link:
            avatar_img = avatar_link.find("img")
            if avatar_img and avatar_img.get("src"):
                logger.info(f"Baixando avatar: {avatar_img['src'][:50]}...")
                avatar_base64 = _download_image_as_base64(session, avatar_img["src"], max_width=AVATAR_MAX_WIDTH)

        else:
            # Fallback: twitter:creator meta tag
            twitter_creator = soup.find(
                "meta", attrs={"name": "twitter:creator"})
            if twitter_creator:
                author = twitter_creator["content"].replace("@", "")

        # ── Poster do filme (base64) ─────────────────────────
        poster_url = ""
        poster_base64 = ""
        og_image = soup.find("meta", property="og:image")
        if og_image:
            poster_url = og_image["content"]
            logger.info(f"Baixando poster: {poster_url}")
            poster_base64 = _download_image_as_base64(session, poster_url, max_width=POSTER_MAX_WIDTH)

        # Fallback: extrai username da URL final
        if not author:
            try:
                final_url = response.url
                parts = final_url.split("/")
                if "letterboxd.com" in parts[2]:
                    author = parts[3]
            except Exception:
                pass

        return ReviewResponse(
            movieTitle=movie_title,
            reviewText=review_text.strip(),
            stars=stars,
            username=author,
            posterUrl=poster_url,
            posterBase64=poster_base64,
            avatarBase64=avatar_base64,
            originalUrl=url
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro crítico ao raspar dados: {type(e).__name__} - {e}")
        raise HTTPException(
            status_code=500, detail=f"Erro crítico ao raspar dados da página html: {str(e)}")
