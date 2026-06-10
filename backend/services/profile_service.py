"""
Serviços de scraping de perfil e diário do Letterboxd.
Usa sessão com cookies reais para evitar bloqueio 403.
"""
import requests
import base64
import re
import time
import random
from bs4 import BeautifulSoup
from fastapi import HTTPException
from models.schemas import ProfileResponse, DiaryResponse, DiaryEntry, FavoriteFilm

# Headers que imitam um navegador Chrome real (evita 403)
HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/124.0.0.0 Safari/537.36'
    ),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,'
              'image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'DNT': '1',
    'Cache-Control': 'max-age=0',
}


def _session() -> requests.Session:
    """Cria sessão com cookies reais visitando a homepage primeiro."""
    s = requests.Session()
    s.headers.update(HEADERS)
    try:
        # Warmup: visita homepage para estabelecer cookies (evita 403)
        s.get('https://letterboxd.com/', timeout=10,
              headers={**HEADERS, 'Referer': 'https://www.google.com/'})
        # Pausa aleatória para parecer mais humano
        time.sleep(random.uniform(0.3, 0.8))
    except Exception:
        pass
    s.headers.update({'Referer': 'https://letterboxd.com/'})
    return s


def _image_to_base64(session: requests.Session, url: str) -> str:
    """Baixa imagem e converte para data URI base64."""
    if not url:
        return ""
    try:
        r = session.get(url, timeout=8)
        if r.status_code == 200:
            ct = r.headers.get('content-type', 'image/jpeg')
            enc = base64.b64encode(r.content).decode('utf-8')
            return f"data:{ct};base64,{enc}"
    except Exception:
        pass
    return ""


def _parse_stars(text: str) -> float:
    """Converte string de estrelas (★★★½) para float (3.5)."""
    return text.count('★') + (0.5 if '½' in text else 0)


def scrape_profile(username: str) -> ProfileResponse:
    """Faz scraping do perfil público de um usuário do Letterboxd."""
    session = _session()
    url = f"https://letterboxd.com/{username}/"

    try:
        r = session.get(url, timeout=15)
        if r.status_code == 403:
            raise HTTPException(
                status_code=503,
                detail="Letterboxd bloqueou o acesso (403). Tente novamente em alguns segundos."
            )
        r.raise_for_status()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao acessar perfil: {str(e)}")

    soup = BeautifulSoup(r.text, 'html.parser')

    if 'Letterboxd' not in soup.get_text():
        raise HTTPException(status_code=404, detail="Perfil não encontrado.")

    # ── Display name ───────────────────────────────────────
    display_name = username
    name_h1 = soup.find('h1', class_='title-1')
    if name_h1:
        display_name = name_h1.get_text(strip=True)
    else:
        og_title = soup.find('meta', property='og:title')
        if og_title:
            display_name = og_title.get('content', username).split("'s")[0].strip()

    # ── Bio ───────────────────────────────────────────────
    bio = ""
    bio_div = soup.find('div', class_='bio')
    if bio_div:
        bio = bio_div.get_text(strip=True)

    # ── Avatar ────────────────────────────────────────────
    avatar_url = ""
    avatar_b64 = ""
    avatar_img = soup.find('span', class_='avatar') or soup.find('div', class_='avatar')
    if avatar_img:
        img = avatar_img.find('img')
        if img and img.get('src'):
            avatar_url = img['src']
            avatar_b64 = _image_to_base64(session, avatar_url)

    # Fallback: og:image pode ser o avatar
    if not avatar_url:
        og_img = soup.find('meta', property='og:image')
        if og_img:
            avatar_url = og_img.get('content', '')

    # ── Stats (filmes, seguidores, seguindo) ──────────────
    total_films = 0
    followers = 0
    following = 0
    total_this_year = 0

    stats_section = soup.find_all('a', href=re.compile(r'/' + re.escape(username) + r'/following/?$|/' + re.escape(username) + r'/followers/?$', re.I))
    for stat_a in stats_section:
        value_el = stat_a.find('span', class_=re.compile(r'value|count', re.I))
        label_el = stat_a.find('span', class_=re.compile(r'label|definition', re.I))
        if value_el and label_el:
            val_text = value_el.get_text(strip=True).replace(',', '').replace('.', '').replace('k', '000')
            try:
                val = int(val_text)
            except ValueError:
                val = 0
            label = label_el.get_text(strip=True).lower()
            if 'follow' in label and 'ing' in label:
                following = val
            elif 'follow' in label:
                followers = val

    # Contagem total de filmes
    films_link = soup.find('a', href=re.compile(f'/{re.escape(username)}/films/?$', re.I))
    if films_link:
        count_span = films_link.find('span', class_=re.compile(r'count|value', re.I))
        if count_span:
            try:
                total_films = int(count_span.get_text(strip=True).replace(',', ''))
            except ValueError:
                pass

    # ── Filmes favoritos ──────────────────────────────────
    favorites: list[FavoriteFilm] = []
    fav_section = soup.find('section', class_=re.compile(r'favourites|favorites', re.I))
    if fav_section:
        for li in fav_section.find_all('li', class_='poster-container'):
            div = li.find('div', {'data-film-slug': True})
            img = li.find('img')
            if div and img:
                title = img.get('alt', '') or div.get('data-film-name', '')
                year_str = div.get('data-film-release-year', '') or ''
                poster_url_raw = img.get('src', '')
                poster_b64 = _image_to_base64(session, poster_url_raw)
                favorites.append(FavoriteFilm(
                    title=title,
                    year=int(year_str) if year_str.isdigit() else None,
                    posterUrl=poster_url_raw,
                    posterBase64=poster_b64,
                ))

    # ── Atividade recente (página 1 do diário) ────────────
    recent = scrape_diary(username, page=1)

    return ProfileResponse(
        username=username,
        displayName=display_name,
        avatarUrl=avatar_url,
        avatarBase64=avatar_b64,
        bio=bio,
        totalFilms=total_films,
        totalThisYear=total_this_year,
        followers=followers,
        following=following,
        favoriteFilms=favorites,
        recentActivity=recent.entries,
    )


def scrape_diary(username: str, page: int = 1) -> DiaryResponse:
    """Faz scraping de uma página do diário (até 28 entradas por página)."""
    session = _session()
    url = f"https://letterboxd.com/{username}/films/diary/page/{page}/"

    try:
        r = session.get(url, timeout=15)
        if r.status_code == 403:
            raise HTTPException(
                status_code=503,
                detail="Letterboxd bloqueou o acesso (403). Tente novamente em alguns segundos."
            )
        r.raise_for_status()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao acessar diário: {str(e)}")

    soup = BeautifulSoup(r.text, 'html.parser')
    entries: list[DiaryEntry] = []

    # Cada linha da tabela é uma entrada do diário
    rows = soup.find_all('tr', class_='diary-entry-row')
    for row in rows:
        try:
            # Data da entrada
            date_td = row.find('td', class_='td-calendar-td')
            date_str = ""
            if date_td:
                date_link = date_td.find('a')
                if date_link and date_link.get('href'):
                    parts = date_link['href'].strip('/').split('/')
                    for_idx = parts.index('for') if 'for' in parts else -1
                    if for_idx >= 0 and len(parts) > for_idx + 3:
                        date_str = f"{parts[for_idx+1]}-{parts[for_idx+2]:>02}-{parts[for_idx+3]:>02}"

            # Título e ano do filme
            title = ""
            year = None
            title_td = row.find('td', class_='td-film-details')
            if title_td:
                title_h3 = title_td.find('h3') or title_td.find('h2')
                if title_h3:
                    title_a = title_h3.find('a')
                    title = title_a.get_text(strip=True) if title_a else title_h3.get_text(strip=True)
                year_span = title_td.find('span', class_='year')
                if year_span:
                    try:
                        year = int(year_span.get_text(strip=True))
                    except ValueError:
                        pass

            # Nota em estrelas
            stars = 0.0
            rating_td = row.find('td', class_='td-rating')
            if rating_td:
                rating_span = rating_td.find('span', class_=re.compile(r'rating', re.I))
                if rating_span:
                    stars = _parse_stars(rating_span.get_text())

            # Poster do filme
            poster_url = ""
            poster_b64 = ""
            img_div = row.find('div', class_=re.compile(r'film-poster', re.I))
            if img_div:
                img = img_div.find('img')
                if img and img.get('src'):
                    poster_url = img['src']
                    # Só baixa poster na página 1 para evitar timeout
                    if page == 1:
                        poster_b64 = _image_to_base64(session, poster_url)

            # Link do filme no Letterboxd
            review_url = ""
            letterboxd_uri = ""
            name_td = row.find('td', class_='td-film-details')
            if name_td:
                links = name_td.find_all('a', href=True)
                for lnk in links:
                    if '/film/' in lnk['href']:
                        letterboxd_uri = f"https://letterboxd.com{lnk['href']}"
                        break

            if title:
                entries.append(DiaryEntry(
                    date=date_str,
                    movieTitle=title,
                    year=year,
                    stars=stars,
                    posterUrl=poster_url,
                    posterBase64=poster_b64,
                    reviewUrl=review_url,
                    letterboxdUri=letterboxd_uri,
                ))
        except Exception:
            continue

    return DiaryResponse(entries=entries, page=page, username=username)
