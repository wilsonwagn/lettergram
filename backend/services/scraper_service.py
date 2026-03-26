import requests
import base64
import re
from bs4 import BeautifulSoup
from fastapi import HTTPException
from models.schemas import ReviewResponse


def extract_letterboxd_review(url: str) -> ReviewResponse:
    """
    Função de serviço isolada exclusivamente para a regra de negócio do web scraping da página do Letterboxd.
    """
    print(f"\n🔍 Iniciando scraping de: {url}")

    if not url.startswith("http"):
        url = "https://" + url

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://letterboxd.com/'
    }

    # Usar sessão persistente para manter cookies e contexto de navegador
    session = requests.Session()
    session.headers.update(headers)
    print("✅ Session criada com User-Agent e Referer")

    try:
        response = session.get(url, allow_redirects=True, timeout=10)
        response.raise_for_status()
        print(f"✅ Página carregada ({len(response.text)} bytes)")
    except Exception as e:
        print(f"❌ Erro ao acessar URL: {type(e).__name__} - {e}")
        raise HTTPException(
            status_code=400, detail=f"Erro ao acessar URL do Letterboxd: {str(e)}")

    soup = BeautifulSoup(response.text, 'html.parser')

    # Validação inicial: se não existe "Letterboxd" no texto ou meta-tags, é um link inválido
    if "Letterboxd" not in soup.get_text():
        raise HTTPException(
            status_code=400, detail="A URL fornecida não parece ser uma página válida do Letterboxd.")

    try:
        og_title = soup.find("meta", property="og:title")
        title_raw = og_title["content"] if og_title else ""

        # O Letterboxd as vezes coloca "A review of", "A ★★★★ review of", "wilsonwagn's review of...", etc.
        # Vamos remover qualquer coisa antes de "review of " (incluindo estrelas) e o "review of " em si
        # Usamos um regex mais robusto que lida com espaços e caracteres especiais
        movie_title = re.sub(r'^.*?\breview\s+of\s+', '',
                             title_raw, flags=re.IGNORECASE | re.UNICODE)

        # Se ainda houver o sufixo " - Letterboxd" ou o nome do usuário no final
        movie_title = movie_title.split(" - ")[0]
        movie_title = movie_title.strip()

        # Fallback de segurança se o regex falhar
        if "review of " in movie_title.lower():
            movie_title = movie_title.lower().split(
                "review of ")[-1].capitalize()

        review_div = soup.find("div", class_="review bodytext")
        review_text = ""
        if review_div:
            paragraphs = review_div.find_all("p")
            review_text = "\n\n".join([p.get_text() for p in paragraphs])
        else:
            og_desc = soup.find("meta", property="og:description")
            review_text = og_desc["content"] if og_desc else ""

        rating_span = soup.find("span", class_="rating")
        stars = 0.0
        if rating_span:
            text_rating = rating_span.get_text()
            stars += text_rating.count("★")
            if "½" in text_rating:
                stars += 0.5

        # Fallback 1: buscar em qualquer span com 'rating' no nome da classe
        if stars == 0.0:
            all_rating_spans = soup.find_all("span", class_=lambda c: c and "rating" in c.lower())
            for span in all_rating_spans:
                t = span.get_text()
                if "★" in t:
                    stars = t.count("★") + (0.5 if "½" in t else 0)
                    break

        # Fallback 2: buscar estrelas no og:description (Letterboxd sempre inclui)
        if stars == 0.0:
            og_desc_meta = soup.find("meta", property="og:description")
            if og_desc_meta:
                desc_text = og_desc_meta.get("content", "")
                if "★" in desc_text:
                    stars = desc_text.count("★") + (0.5 if "½" in desc_text else 0)
                    print(f"⭐ Estrelas extraídas do og:description: {stars}")

        author = ""
        avatar_base64 = ""
        author_span = soup.find("span", itemprop="name")
        if author_span:
            author = author_span.get_text()

        # Tentar pegar foto de perfil do usuario
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
            twitter_creator = soup.find(
                "meta", attrs={"name": "twitter:creator"})
            if twitter_creator:
                author = twitter_creator["content"].replace("@", "")

        poster_url = ""
        poster_base64 = ""
        og_image = soup.find("meta", property="og:image")
        if og_image:
            poster_url = og_image["content"]
            print(f"📸 Tentando baixar poster: {poster_url}")
            try:
                # Converter para Base64 para evitar erro de CORS no download do frontend
                img_res = session.get(poster_url, timeout=5)
                print(f"   Status: {img_res.status_code}")
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
