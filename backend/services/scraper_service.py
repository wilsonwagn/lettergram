"""
Scraper de reviews individuais do Letterboxd.
Recebe a URL de uma review e retorna título, nota, texto, poster e avatar.
Usa requests + BeautifulSoup para parsing do HTML.
"""
import requests
import base64
import re
from bs4 import BeautifulSoup
from fastapi import HTTPException
from models.schemas import ReviewResponse


def extract_letterboxd_review(url: str) -> ReviewResponse:
    """
    Scraping completo de uma review do Letterboxd.
    Extrai: título do filme, texto da review, estrelas, poster (base64) e avatar.
    """
    print(f"\n🔍 Iniciando scraping de: {url}")

    # Garante protocolo https
    if not url.startswith("http"):
        url = "https://" + url

    # ── Validação: aceita apenas links do Letterboxd (ou boxd.it encurtados) ──
    from urllib.parse import urlparse
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
        print(f"✅ Página carregada ({len(response.text)} bytes)")
    except Exception as e:
        print(f"❌ Erro ao acessar URL: {type(e).__name__} - {e}")
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
                    print(f"⭐ Estrelas extraídas do og:description: {stars}")

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
                print(f"🎭 Tentando baixar avatar: {avatar_img['src'][:50]}...")
                try:
                    av_res = session.get(avatar_img["src"], timeout=5)
                    if av_res.status_code == 200:
                        av_content_type = av_res.headers.get(
                            'content-type', 'image/jpeg')
                        av_encoded = base64.b64encode(
                            av_res.content).decode('utf-8')
                        avatar_base64 = f"data:{av_content_type};base64,{av_encoded}"
                        print(f"   ✅ Avatar convertido ({len(av_encoded)} chars)")
                    else:
                        print(f"   ❌ Status {av_res.status_code}")
                except Exception as e:
                    print(f"   ❌ Erro: {type(e).__name__} - {e}")

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
            print(f"📸 Tentando baixar poster: {poster_url}")
            try:
                img_res = session.get(poster_url, timeout=5)
                if img_res.status_code == 200:
                    content_type = img_res.headers.get(
                        'content-type', 'image/jpeg')
                    encoded = base64.b64encode(img_res.content).decode('utf-8')
                    poster_base64 = f"data:{content_type};base64,{encoded}"
                    print(f"   ✅ Poster convertido para Base64 ({len(encoded)} chars)")
                else:
                    print(f"   ❌ Status {img_res.status_code}")
            except Exception as e:
                print(f"   ❌ Erro ao converter poster: {type(e).__name__} - {e}")

        # Fallback: extrai username da URL final
        if not author:
            try:
                final_url = response.url
                parts = final_url.split("/")
                if "letterboxd.com" in parts[2]:
                    author = parts[3]
            except:
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
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro crítico ao raspar dados da página html: {str(e)}")
