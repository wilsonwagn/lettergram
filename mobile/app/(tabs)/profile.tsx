import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import {
  getUsername, getProfile, getDiary, getLastSync,
  saveUsername, saveDiary, saveCSVImported,
} from '../../services/storage';
import { ProfileData, DiaryEntry, parseLetterboxdCSV } from '../../services/letterboxd';
import { clearAll } from '../../services/storage';

export default function ProfileScreen() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [diaryCount, setDiaryCount] = useState(0);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const u = await getUsername();
    const p = await getProfile();
    const d = await getDiary();
    const ls = await getLastSync();
    setUsername(u);
    setProfile(p);
    setDiaryCount(d.length);
    setLastSync(ls);
  };

  const handleImportCSV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/plain', 'application/csv', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      const response = await fetch(file.uri);
      const text = await response.text();

      // Determine which CSV file this is (diary.csv or ratings.csv)
      const firstLine = text.split('\n')[0].toLowerCase();
      const isDiary = firstLine.includes('date') && firstLine.includes('name');
      const isRatings = firstLine.includes('rating') && firstLine.includes('name');

      if (!isDiary && !isRatings) {
        Alert.alert('Arquivo inválido', 'Por favor, importe o arquivo "diary.csv" ou "ratings.csv" exportado do Letterboxd.');
        return;
      }

      const entries: DiaryEntry[] = parseLetterboxdCSV(text);

      if (entries.length === 0) {
        Alert.alert('Sem dados', 'Nenhum filme encontrado no arquivo CSV.');
        return;
      }

      // Merge with existing diary (avoid duplicates by letterboxdUri or title+date)
      const existing = await import('../../services/storage').then(m => m.getDiary());
      const existingKeys = new Set(existing.map(e => `${e.movieTitle}_${e.date}`));
      const newEntries = entries.filter(e => !existingKeys.has(`${e.movieTitle}_${e.date}`));
      const merged = [...existing, ...newEntries].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      await saveDiary(merged);
      await saveCSVImported(true);
      setDiaryCount(merged.length);

      Alert.alert(
        '✅ CSV importado!',
        `${entries.length} filmes importados (${newEntries.length} novos).\nTotal no diário: ${merged.length} filmes.`
      );
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível importar o CSV. Tente novamente.');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Trocar conta',
      'Isso vai apagar todos os dados salvos localmente. Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: async () => {
            await clearAll();
            router.replace('/onboarding');
          },
        },
      ]
    );
  };

  const formatSync = (iso: string | null) => {
    if (!iso) return 'Nunca sincronizado';
    const d = new Date(iso);
    return `Última sync: ${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile header */}
        <View style={styles.profileHeader}>
          {profile?.avatarBase64 || profile?.avatarUrl ? (
            <Image
              source={{ uri: profile.avatarBase64 || profile.avatarUrl }}
              style={styles.avatar}
              contentFit="cover"
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {(username ?? '?')[0].toUpperCase()}
              </Text>
            </View>
          )}

          <Text style={styles.displayName}>{profile?.displayName || username}</Text>
          <Text style={styles.usernameText}>@{username}</Text>
          {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
        </View>

        {/* Stats */}
        {profile && (
          <View style={styles.statsRow}>
            <StatItem label="Filmes" value={String(profile.totalFilms || diaryCount)} />
            <View style={styles.statDivider} />
            <StatItem label="Seguidores" value={String(profile.followers ?? '—')} />
            <View style={styles.statDivider} />
            <StatItem label="Seguindo" value={String(profile.following ?? '—')} />
          </View>
        )}

        {/* Sync status */}
        <View style={styles.syncCard}>
          <Text style={styles.syncStatus}>{formatSync(lastSync)}</Text>
          <Text style={styles.syncCount}>{diaryCount} filmes no diário</Text>
        </View>

        {/* Favorites */}
        {profile?.favoriteFilms && profile.favoriteFilms.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Filmes favoritos</Text>
            <View style={styles.favsGrid}>
              {profile.favoriteFilms.slice(0, 4).map((film, i) => (
                <View key={i} style={styles.favItem}>
                  <Image
                    source={{ uri: film.posterBase64 || film.posterUrl }}
                    style={styles.favPoster}
                    contentFit="cover"
                  />
                  <Text style={styles.favTitle} numberOfLines={2}>{film.title}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados & Importação</Text>

          <TouchableOpacity style={styles.actionCard} onPress={handleImportCSV}>
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>📥</Text>
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Importar CSV do Letterboxd</Text>
              <Text style={styles.actionSub}>
                Settings → Import &amp; Export → Export your data
              </Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => Alert.alert('Como exportar CSV', '1. Abra letterboxd.com no browser\n2. Vá em Settings → Import & Export\n3. Clique em "Export Your Data"\n4. Baixe o ZIP e extraia\n5. Importe o arquivo diary.csv aqui')}>
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>❓</Text>
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Como exportar do Letterboxd?</Text>
              <Text style={styles.actionSub}>Ver instruções passo a passo</Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Danger zone */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.dangerBtn} onPress={handleLogout}>
            <Text style={styles.dangerBtnText}>Trocar conta</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.screenPadding, paddingTop: Spacing.lg },
  profileHeader: { alignItems: 'center', paddingBottom: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.border, marginBottom: Spacing.xl },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.surface2, marginBottom: Spacing.md },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.accentDim, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md, borderWidth: 2, borderColor: Colors.accent },
  avatarInitial: { fontSize: Typography['2xl'], fontFamily: Typography.fontBold, color: Colors.accent },
  displayName: { fontSize: Typography.xl, fontFamily: Typography.fontBold, color: Colors.text },
  usernameText: { fontSize: Typography.base, fontFamily: Typography.fontRegular, color: Colors.textMuted, marginTop: 2 },
  bio: { fontSize: Typography.sm, fontFamily: Typography.fontRegular, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 20 },
  statsRow: { flexDirection: 'row', backgroundColor: Colors.surface1, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, paddingVertical: Spacing.lg, marginBottom: Spacing.xl },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: Typography.xl, fontFamily: Typography.fontBold, color: Colors.text },
  statLabel: { fontSize: Typography.xs, fontFamily: Typography.fontRegular, color: Colors.textMuted, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: Colors.border },
  syncCard: { backgroundColor: Colors.surface2, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.xl, borderWidth: 1, borderColor: Colors.border },
  syncStatus: { fontSize: Typography.sm, fontFamily: Typography.fontMedium, color: Colors.textSecondary },
  syncCount: { fontSize: Typography.sm, fontFamily: Typography.fontRegular, color: Colors.textMuted, marginTop: 2 },
  section: { marginBottom: Spacing.xl },
  sectionTitle: { fontSize: Typography.base, fontFamily: Typography.fontSemiBold, color: Colors.textSecondary, marginBottom: Spacing.md, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: Typography.sm },
  favsGrid: { flexDirection: 'row', gap: Spacing.sm },
  favItem: { flex: 1 },
  favPoster: { width: '100%', aspectRatio: 2/3, borderRadius: Radius.md, backgroundColor: Colors.surface2, marginBottom: 4 },
  favTitle: { fontSize: Typography.xs, fontFamily: Typography.fontMedium, color: Colors.textSecondary, lineHeight: 14 },
  actionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface1, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm, gap: Spacing.md },
  actionIcon: { width: 40, height: 40, borderRadius: Radius.md, backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center' },
  actionIconText: { fontSize: 18 },
  actionInfo: { flex: 1 },
  actionTitle: { fontSize: Typography.base, fontFamily: Typography.fontSemiBold, color: Colors.text },
  actionSub: { fontSize: Typography.sm, fontFamily: Typography.fontRegular, color: Colors.textMuted, marginTop: 2 },
  actionArrow: { fontSize: Typography.xl, color: Colors.textMuted },
  dangerBtn: { borderWidth: 1, borderColor: 'rgba(255,77,77,0.3)', borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', backgroundColor: 'rgba(255,77,77,0.06)' },
  dangerBtnText: { fontSize: Typography.base, fontFamily: Typography.fontSemiBold, color: Colors.error },
});
