/**
 * Storage service — gerencia dados no AsyncStorage (cache local).
 * Salva username, perfil, diário e status de sync no dispositivo.
 * Sem conta, sem senha — tudo local.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// Chaves do AsyncStorage (prefixo lg_ = LetterGram)
const KEYS = {
  USERNAME: 'lg_username',
  PROFILE: 'lg_profile',
  DIARY: 'lg_diary',
  LAST_SYNC: 'lg_last_sync',
  CSV_IMPORTED: 'lg_csv_imported',
} as const;

// ── Username ─────────────────────────────────────────────
export async function saveUsername(username: string) {
  await AsyncStorage.setItem(KEYS.USERNAME, username.trim().toLowerCase());
}

export async function getUsername(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.USERNAME);
}

// ── Profile (cache do scraping) ─────────────────────────
export async function saveProfile(data: any) {
  await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(data));
  await AsyncStorage.setItem(KEYS.LAST_SYNC, new Date().toISOString());
}

export async function getProfile(): Promise<any | null> {
  const raw = await AsyncStorage.getItem(KEYS.PROFILE);
  return raw ? JSON.parse(raw) : null;
}

// ── Diary (cache de entradas do diário) ─────────────────
export async function saveDiary(entries: any[]) {
  await AsyncStorage.setItem(KEYS.DIARY, JSON.stringify(entries));
}

export async function getDiary(): Promise<any[]> {
  const raw = await AsyncStorage.getItem(KEYS.DIARY);
  return raw ? JSON.parse(raw) : [];
}

// ── Sync metadata ───────────────────────────────────────
export async function getLastSync(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.LAST_SYNC);
}

export async function saveCSVImported(flag: boolean) {
  await AsyncStorage.setItem(KEYS.CSV_IMPORTED, String(flag));
}

export async function getCSVImported(): Promise<boolean> {
  const v = await AsyncStorage.getItem(KEYS.CSV_IMPORTED);
  return v === 'true';
}

// ── Reset (limpa todos os dados) ────────────────────────
export async function clearAll() {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}
