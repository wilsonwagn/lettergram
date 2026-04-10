import requests
import base64
import re
from bs4 import BeautifulSoup
from fastapi import HTTPException
from models.schemas import ProfileResponse, DiaryResponse, DiaryEntry, FavoriteFilm

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': 'https://letterboxd.com/',
}


def _session() -> requests.Session:
    s = requests.Session()
    s.headers.update(HEADERS)
    return s


def _image_to_base64(session: requests.Session, url: str) -> str:
    """Faz download de uma imagem e converte para base64 data URI."""
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
    """Converte string de estrelas (★★★½) para float."""
    stars = text.count('★') + (0.5 if '½' in text else 0)
    return stars


def scrape_profile(username: str) -> ProfileResponse:
    """
    Faz scraping do perfil público de um usuário do Letterboxd.
    Página: letterboxd.com/{username}/
    """
    session = _session()
    url = f"https://letterboxd.com/{username}/"

    try:
        r = session.get(url, timeout=12)
        r.raise_for_status()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao acessar perfil: {str(e)}")

    soup = BeautifulSoup(r.text, 'html.parser')

    # Validação
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

    # Fallback: og:image might be the avatar
    if not avatar_url:
        og_img = soup.find('meta', property='og:image')
        if og_img:
            avatar_url = og_img.get('content', '')

    # ── Stats (filmes, seguidores, seguindo) ──────────────
    total_films = 0
    followers = 0
    following = 0
    total_this_year = 0

    # Try the stats from the profile sidebar
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

    # film count from /films/ page stat
    films_link = soup.find('a', href=re.compile(f'/{re.escape(username)}/films/?$', re.I))
    if films_link:
        count_span = films_link.find('span', class_=re.compile(r'count|value', re.I))
        if count_span:
            try:
                total_films = int(count_span.get_text(strip=True).replace(',', ''))
            except ValueError:
                pass

    # ── Favorite films ────────────────────────────────────
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

    # ── Recent activity (diary) ────────────────────────────
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
    """
    Faz scraping do diário de filmes de um usuário do Letterboxd.
    URL: letterboxd.com/{username}/films/diary/page/{page}/
    Retorna até 28 entradas por página.
    """
    session = _session()
    url = f"https://letterboxd.com/{username}/films/diary/page/{page}/"

    try:
        r = session.get(url, timeout=12)
        r.raise_for_status()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao acessar diário: {str(e)}")

    soup = BeautifulSoup(r.text, 'html.parser')
    entries: list[DiaryEntry] = []

    # Each diary entry row
    rows = soup.find_all('tr', class_='diary-entry-row')
    for row in rows:
        try:
            # Date
            date_td = row.find('td', class_='td-calendar-td')
            date_str = ""
            if date_td:
                date_link = date_td.find('a')
                if date_link and date_link.get('href'):
                    # href like /username/films/diary/for/2025/04/10/
                    parts = date_link['href'].strip('/').split('/')
                    # structure: username/films/diary/for/YYYY/MM/DD
                    for_idx = parts.index('for') if 'for' in parts else -1
                    if for_idx >= 0 and len(parts) > for_idx + 3:
                        date_str = f"{parts[for_idx+1]}-{parts[for_idx+2]:>02}-{parts[for_idx+3]:>02}"

            # Movie title & year
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

            # Stars / rating
            stars = 0.0
            rating_td = row.find('td', class_='td-rating')
            if rating_td:
                rating_span = rating_td.find('span', class_=re.compile(r'rating', re.I))
                if rating_span:
                    stars = _parse_stars(rating_span.get_text())

            # Poster
            poster_url = ""
            poster_b64 = ""
            img_div = row.find('div', class_=re.compile(r'film-poster', re.I))
            if img_div:
                img = img_div.find('img')
                if img and img.get('src'):
                    poster_url = img['src']
                    # Only download poster for first page to avoid timeout
                    if page == 1:
                        poster_b64 = _image_to_base64(session, poster_url)

            # Review / Letterboxd URI
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
