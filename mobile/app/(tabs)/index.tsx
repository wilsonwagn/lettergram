import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import {
  getUsername, getProfile, getDiary, saveProfile,
  saveDiary, getLastSync,
} from '../../services/storage';
import {
  fetchProfile, fetchAllDiary, computeRecap,
  ProfileData, DiaryEntry, RecapData,
} from '../../services/letterboxd';
import { RecapShareCard } from '../../components/RecapShareCard';
import { MonthlyBar } from '../../components/MonthlyBar';

const { width } = Dimensions.get('window');
const POSTER_W = 80;
const POSTER_H = 120;

export default function HomeScreen() {
  const [username, setUsername] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [diary, setDiary] = useState<DiaryEntry[]>([]);
  const [recap, setRecap] = useState<RecapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [backendOffline, setBackendOffline] = useState(false);

  // Load from cache first
  useEffect(() => {
    loadFromCache();
  }, []);

  const loadFromCache = async () => {
    setLoading(true);
    const u = await getUsername();
    setUsername(u);

    const cachedProfile = await getProfile();
    const cachedDiary = await getDiary();
    const ls = await getLastSync();
    setLastSync(ls);

    if (cachedProfile) setProfile(cachedProfile);
    if (cachedDiary.length > 0) {
      setDiary(cachedDiary);
      setRecap(computeRecap(cachedDiary));
    }

    setLoading(false);

    // Auto-sync if no cache
    if (!cachedProfile || cachedDiary.length === 0) {
      syncData(u ?? '');
    }
  };

  const syncData = async (user?: string) => {
    const u = user ?? username ?? '';
    if (!u) return;
    setSyncing(true);
    setBackendOffline(false);

    try {
      // Fetch profile + diary in parallel
      const [profileData, diaryData] = await Promise.all([
        fetchProfile(u),
        fetchAllDiary(u),
      ]);

      await saveProfile(profileData);
      await saveDiary(diaryData);

      setProfile(profileData);
      setDiary(diaryData);
      setRecap(computeRecap(diaryData));

      const now = new Date().toISOString();
      setLastSync(now);
    } catch (e: any) {
      setBackendOffline(true);
      if (!profile) {
        Alert.alert(
          'Backend offline',
          'Inicie o servidor Python (backend) na porta 8000 para sincronizar seus dados.\n\nEnquanto isso, importe seu CSV do Letterboxd na aba Perfil.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setSyncing(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    syncData();
  }, [username]);

  const formatLastSync = (iso: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    return `Sync ${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const currentYear = new Date().getFullYear();
  const currentMonthName = new Date().toLocaleDateString('pt-BR', { month: 'long' });

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={Colors.accent} size="large" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.accent}
            colors={[Colors.accent]}
          />
        }
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerGreeting}>Olá, {username} 👋</Text>
            <Text style={styles.headerSub}>
              {lastSync ? formatLastSync(lastSync) : 'Arraste para sincronizar'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.syncBtn, syncing && styles.syncBtnLoading]}
            onPress={() => syncData()}
            disabled={syncing}
          >
            {syncing ? (
              <ActivityIndicator color={Colors.accent} size="small" />
            ) : (
              <Text style={styles.syncBtnText}>⟳ Sync</Text>
            )}
          </TouchableOpacity>
        </View>

        {backendOffline && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineBannerText}>
              ⚠️ Backend offline — exibindo dados do cache
            </Text>
          </View>
        )}

        {/* ── Year Recap Hero ─────────────────────────────────── */}
        {recap && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recap {currentYear}</Text>
              <View style={styles.accentPill}>
                <Text style={styles.accentPillText}>Anual</Text>
              </View>
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <StatCard
                label="Filmes"
                value={String(recap.totalFilms)}
                icon="🎬"
              />
              <StatCard
                label="Média"
                value={recap.averageRating > 0 ? `★ ${recap.averageRating.toFixed(1)}` : '—'}
                icon="⭐"
              />
              <StatCard
                label="Mês top"
                value={recap.mostActiveMonth || '—'}
                icon="📅"
              />
            </View>

            {/* Monthly bar chart */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Filmes por mês</Text>
              <MonthlyBar data={recap.monthlyBreakdown} />
            </View>

            {/* Top films of the year */}
            {recap.topFilms.length > 0 && (
              <View style={[styles.card, { paddingBottom: Spacing.md }]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>Top filmes do ano</Text>
                  <Text style={styles.cardSubtitle}>por nota</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
                  {recap.topFilms.map((film, idx) => (
                    <FilmPoster key={idx} film={film} rank={idx + 1} />
                  ))}
                </ScrollView>
              </View>
            )}
          </>
        )}

        {/* ── This Month ──────────────────────────────────────── */}
        {recap && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1)}
              </Text>
              <View style={[styles.accentPill, { backgroundColor: 'rgba(0,224,150,0.12)' }]}>
                <Text style={[styles.accentPillText, { color: Colors.success }]}>Mensal</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <StatCard
                label="Este mês"
                value={String(recap.thisMonthCount)}
                icon="📽️"
                accent
              />
              <StatCard
                label="Mês anterior"
                value={String(recap.lastMonthCount)}
                icon="📆"
              />
              <StatCard
                label="Variação"
                value={recap.lastMonthCount > 0
                  ? `${recap.thisMonthCount >= recap.lastMonthCount ? '+' : ''}${recap.thisMonthCount - recap.lastMonthCount}`
                  : '—'}
                icon={recap.thisMonthCount >= recap.lastMonthCount ? '📈' : '📉'}
              />
            </View>

            {/* Top 3 last 3 months */}
            {recap.topFilmsMonth.length > 0 && (
              <View style={[styles.card, { paddingBottom: Spacing.md }]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>Melhores dos últimos 3 meses</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
                  {recap.topFilmsMonth.map((film, idx) => (
                    <FilmPoster key={idx} film={film} rank={idx + 1} />
                  ))}
                </ScrollView>
              </View>
            )}
          </>
        )}

        {/* ── Share Recap Image ───────────────────────────────── */}
        {recap && recap.totalFilms > 0 && (
          <RecapShareCard recap={recap} username={username ?? ''} />
        )}

        {/* ── Favorites ──────────────────────────────────────── */}
        {profile?.favoriteFilms && profile.favoriteFilms.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Favoritos</Text>
              <Text style={styles.cardSubtitle}>Do seu perfil</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScrollOuter}>
              {profile.favoriteFilms.map((film, i) => (
                <View key={i} style={styles.favCard}>
                  <Image
                    source={{ uri: film.posterBase64 || film.posterUrl }}
                    style={styles.favPoster}
                    contentFit="cover"
                  />
                  <Text style={styles.favTitle} numberOfLines={2}>{film.title}</Text>
                  {film.year && <Text style={styles.favYear}>{film.year}</Text>}
                </View>
              ))}
            </ScrollView>
          </>
        )}

        {/* Empty state */}
        {!recap && !syncing && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎬</Text>
            <Text style={styles.emptyTitle}>Nenhum dado ainda</Text>
            <Text style={styles.emptyText}>
              Inicie o backend Python e puxe para sincronizar,{'\n'}ou importe seu CSV do Letterboxd na aba Perfil.
            </Text>
            <TouchableOpacity style={styles.btn} onPress={() => syncData()}>
              <Text style={styles.btnText}>Tentar sincronizar</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, value, icon, accent }: { label: string; value: string; icon: string; accent?: boolean }) {
  return (
    <View style={[statStyles.card, accent && statStyles.cardAccent]}>
      <Text style={statStyles.icon}>{icon}</Text>
      <Text style={[statStyles.value, accent && statStyles.valueAccent]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

function FilmPoster({ film, rank }: { film: DiaryEntry; rank: number }) {
  const starsStr = film.stars > 0 ? '★'.repeat(Math.floor(film.stars)) + (film.stars % 1 ? '½' : '') : '';

  return (
    <View style={posterStyles.wrap}>
      <View style={posterStyles.rank}>
        <Text style={posterStyles.rankText}>{rank}</Text>
      </View>
      <Image
        source={{ uri: film.posterBase64 || film.posterUrl || 'https://placehold.co/80x120/1A1A1A/CCFF00?text=?' }}
        style={posterStyles.image}
        contentFit="cover"
        transition={300}
      />
      <Text style={posterStyles.title} numberOfLines={2}>{film.movieTitle}</Text>
      {starsStr ? <Text style={posterStyles.stars}>{starsStr}</Text> : null}
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.screenPadding, paddingTop: Spacing.lg },
  loadingScreen: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: Colors.textMuted, fontFamily: Typography.fontMedium, fontSize: Typography.base },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  headerGreeting: {
    fontSize: Typography.xl,
    fontFamily: Typography.fontBold,
    color: Colors.text,
  },
  headerSub: {
    fontSize: Typography.sm,
    fontFamily: Typography.fontRegular,
    color: Colors.textMuted,
    marginTop: 2,
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    minWidth: 72,
    justifyContent: 'center',
  },
  syncBtnLoading: { opacity: 0.7 },
  syncBtnText: { color: Colors.accent, fontFamily: Typography.fontSemiBold, fontSize: Typography.sm },
  offlineBanner: {
    backgroundColor: 'rgba(255,170,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,170,0,0.25)',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  offlineBannerText: { color: Colors.warning, fontFamily: Typography.fontMedium, fontSize: Typography.sm },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    marginTop: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.lg,
    fontFamily: Typography.fontBold,
    color: Colors.text,
  },
  accentPill: {
    backgroundColor: Colors.accentDim,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  accentPillText: {
    color: Colors.accent,
    fontSize: Typography.xs,
    fontFamily: Typography.fontSemiBold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  card: {
    backgroundColor: Colors.surface1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: Typography.base,
    fontFamily: Typography.fontSemiBold,
    color: Colors.text,
  },
  cardSubtitle: {
    fontSize: Typography.sm,
    fontFamily: Typography.fontRegular,
    color: Colors.textMuted,
  },
  hScroll: { marginHorizontal: -Spacing.lg, paddingHorizontal: Spacing.lg, marginTop: Spacing.sm },
  hScrollOuter: { marginHorizontal: -Spacing.screenPadding, paddingHorizontal: Spacing.screenPadding, marginBottom: Spacing.md },
  favCard: { width: 100, marginRight: Spacing.md },
  favPoster: { width: 100, height: 150, borderRadius: Radius.md, backgroundColor: Colors.surface2, marginBottom: Spacing.xs },
  favTitle: { fontSize: Typography.sm, fontFamily: Typography.fontMedium, color: Colors.text, lineHeight: 16 },
  favYear: { fontSize: Typography.xs, fontFamily: Typography.fontRegular, color: Colors.textMuted, marginTop: 2 },
  emptyState: { alignItems: 'center', paddingVertical: Spacing['4xl'], gap: Spacing.md },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: Typography.lg, fontFamily: Typography.fontBold, color: Colors.text },
  emptyText: { fontSize: Typography.base, fontFamily: Typography.fontRegular, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 },
  btn: { backgroundColor: Colors.accent, paddingHorizontal: Spacing['2xl'], paddingVertical: Spacing.md, borderRadius: Radius.lg, marginTop: Spacing.sm },
  btnText: { color: '#000', fontFamily: Typography.fontBold, fontSize: Typography.base },
});

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.surface1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  cardAccent: {
    backgroundColor: Colors.accentDim,
    borderColor: 'rgba(204,255,0,0.2)',
  },
  icon: { fontSize: 20 },
  value: {
    fontSize: Typography.lg,
    fontFamily: Typography.fontBold,
    color: Colors.text,
  },
  valueAccent: { color: Colors.accent },
  label: {
    fontSize: Typography.xs,
    fontFamily: Typography.fontRegular,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});

const posterStyles = StyleSheet.create({
  wrap: {
    width: POSTER_W,
    marginRight: Spacing.md,
    alignItems: 'center',
  },
  rank: {
    position: 'absolute',
    top: -6,
    left: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  rankText: {
    fontSize: Typography.xs,
    fontFamily: Typography.fontBlack,
    color: '#000',
  },
  image: {
    width: POSTER_W,
    height: POSTER_H,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface2,
  },
  title: {
    fontSize: Typography.xs,
    fontFamily: Typography.fontMedium,
    color: Colors.text,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 14,
  },
  stars: {
    fontSize: Typography.xs,
    color: Colors.accent,
    marginTop: 2,
  },
});
