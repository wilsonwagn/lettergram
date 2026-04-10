import axios from 'axios';

// ─── Backend URL ────────────────────────────────────────────────────────────
// Change this to your local machine IP when running the Python backend
// e.g., 'http://192.168.1.10:8000'
// Use ngrok for testing on physical device without same-network requirement
export const API_BASE = 'http://10.0.2.2:8000'; // Android emulator → localhost
// export const API_BASE = 'http://192.168.X.X:8000'; // Physical device (same WiFi)

const api = axios.create({ baseURL: API_BASE, timeout: 20000 });

// ─── Types ──────────────────────────────────────────────────────────────────
export interface DiaryEntry {
  date: string;          // ISO date string
  movieTitle: string;
  year: number | null;
  stars: number;
  posterUrl: string;
  posterBase64?: string;
  reviewUrl: string;
  letterboxdUri: string;
}

export interface ProfileData {
  username: string;
  displayName: string;
  avatarUrl: string;
  avatarBase64?: string;
  bio: string;
  totalFilms: number;
  totalThisYear: number;
  following: number;
  followers: number;
  favoriteFilms: FavoriteFilm[];
  recentActivity: DiaryEntry[];
}

export interface FavoriteFilm {
  title: string;
  year: number | null;
  posterUrl: string;
  posterBase64?: string;
}

export interface RecapData {
  year: number;
  totalFilms: number;
  averageRating: number;
  topFilms: DiaryEntry[];       // Top 5 by rating
  topFilmsMonth: DiaryEntry[];  // Top 3 last 3 months
  mostActiveMonth: string;
  monthlyBreakdown: { month: string; count: number }[];
  thisMonthCount: number;
  lastMonthCount: number;
  ratingDistribution: { stars: number; count: number }[];
}

export interface ReviewData {
  movieTitle: string;
  reviewText: string;
  stars: number;
  username: string;
  posterUrl: string;
  posterBase64: string;
  avatarBase64: string;
  originalUrl: string;
}

// ─── API Calls ──────────────────────────────────────────────────────────────

export async function fetchReview(url: string): Promise<ReviewData> {
  const res = await api.get('/api/extract', { params: { url } });
  return res.data;
}

export async function fetchProfile(username: string): Promise<ProfileData> {
  const res = await api.get(`/api/profile/${username}`);
  return res.data;
}

export async function fetchDiary(username: string, page = 1): Promise<DiaryEntry[]> {
  const res = await api.get(`/api/diary/${username}`, { params: { page } });
  return res.data;
}

export async function fetchAllDiary(username: string): Promise<DiaryEntry[]> {
  // Paginate through all diary entries
  let page = 1;
  const all: DiaryEntry[] = [];
  while (true) {
    const entries = await fetchDiary(username, page);
    if (entries.length === 0) break;
    all.push(...entries);
    if (entries.length < 28) break; // Letterboxd shows 28 per page
    page++;
    if (page > 40) break; // Safety cap: ~1120 entries max per sync
  }
  return all;
}

// ─── Recap Computation (client-side) ────────────────────────────────────────

export function computeRecap(diary: DiaryEntry[], year?: number): RecapData {
  const targetYear = year ?? new Date().getFullYear();
  const yearEntries = diary.filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() === targetYear;
  });

  // Monthly breakdown
  const monthCounts: Record<string, number> = {};
  const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  yearEntries.forEach(e => {
    const d = new Date(e.date);
    const key = monthNames[d.getMonth()];
    monthCounts[key] = (monthCounts[key] ?? 0) + 1;
  });

  const monthlyBreakdown = monthNames.map(m => ({ month: m, count: monthCounts[m] ?? 0 }));

  const mostActiveMonth = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '-';

  // Top films by rating
  const rated = yearEntries.filter(e => e.stars > 0).sort((a, b) => b.stars - a.stars);
  const topFilms = rated.slice(0, 5);

  // Top films last 3 months
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const recentEntries = diary
    .filter(e => new Date(e.date) >= threeMonthsAgo && e.stars > 0)
    .sort((a, b) => b.stars - a.stars);
  const topFilmsMonth = recentEntries.slice(0, 3);

  // Average rating
  const ratedEntries = yearEntries.filter(e => e.stars > 0);
  const avgRating = ratedEntries.length > 0
    ? ratedEntries.reduce((s, e) => s + e.stars, 0) / ratedEntries.length
    : 0;

  // This month / last month count
  const thisMonth = now.getMonth();
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const thisMonthYear = now.getFullYear();
  const lastMonthYear = thisMonth === 0 ? thisMonthYear - 1 : thisMonthYear;
  const thisMonthCount = diary.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === thisMonth && d.getFullYear() === thisMonthYear;
  }).length;
  const lastMonthCount = diary.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
  }).length;

  // Rating distribution
  const dist: Record<number, number> = {};
  [0.5,1,1.5,2,2.5,3,3.5,4,4.5,5].forEach(s => { dist[s] = 0; });
  yearEntries.filter(e => e.stars > 0).forEach(e => {
    dist[e.stars] = (dist[e.stars] ?? 0) + 1;
  });
  const ratingDistribution = Object.entries(dist).map(([stars, count]) => ({
    stars: parseFloat(stars),
    count,
  }));

  return {
    year: targetYear,
    totalFilms: yearEntries.length,
    averageRating: parseFloat(avgRating.toFixed(2)),
    topFilms,
    topFilmsMonth,
    mostActiveMonth,
    monthlyBreakdown,
    thisMonthCount,
    lastMonthCount,
    ratingDistribution,
  };
}


// ─── CSV Parser (Letterboxd Export) ─────────────────────────────────────────

export function parseLetterboxdCSV(csvText: string): DiaryEntry[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

  const getIdx = (name: string) => headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));

  const dateIdx = getIdx('Date');
  const nameIdx = getIdx('Name');
  const yearIdx = getIdx('Year');
  const ratingIdx = getIdx('Rating');
  const uriIdx = getIdx('Letterboxd URI');

  const entries: DiaryEntry[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (!cols[nameIdx]) continue;

    const stars = parseFloat(cols[ratingIdx]) || 0;
    entries.push({
      date: cols[dateIdx] ?? '',
      movieTitle: cols[nameIdx]?.replace(/"/g, '') ?? '',
      year: parseInt(cols[yearIdx]) || null,
      stars,
      posterUrl: '',
      reviewUrl: cols[uriIdx] ?? '',
      letterboxdUri: cols[uriIdx] ?? '',
    });
  }

  return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      inQuotes = !inQuotes;
    } else if (line[i] === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += line[i];
    }
  }
  result.push(current.trim());
  return result;
}
