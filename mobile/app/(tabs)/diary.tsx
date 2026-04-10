import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { getDiary } from '../../services/storage';
import { DiaryEntry } from '../../services/letterboxd';

const STARS_MAP = ['', '½', '★', '★½', '★★', '★★½', '★★★', '★★★½', '★★★★', '★★★★½', '★★★★★'];

function formatStars(stars: number): string {
  const idx = Math.round(stars * 2);
  return STARS_MAP[Math.min(idx, 10)] ?? '';
}

function EntryItem({ item }: { item: DiaryEntry }) {
  const date = item.date ? new Date(item.date) : null;
  const dateStr = date
    ? date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';
  const starsStr = formatStars(item.stars);

  return (
    <View style={styles.entry}>
      <Image
        source={{ uri: item.posterBase64 || item.posterUrl || 'https://placehold.co/56x84/1A1A1A/444?text=?' }}
        style={styles.poster}
        contentFit="cover"
        transition={200}
      />
      <View style={styles.entryInfo}>
        <Text style={styles.title} numberOfLines={2}>{item.movieTitle}</Text>
        {item.year ? <Text style={styles.year}>{item.year}</Text> : null}
        <View style={styles.bottomRow}>
          {starsStr ? <Text style={styles.stars}>{starsStr}</Text> : <Text style={styles.noRating}>Sem nota</Text>}
          {dateStr ? <Text style={styles.date}>{dateStr}</Text> : null}
        </View>
      </View>
    </View>
  );
}

export default function DiaryScreen() {
  const [diary, setDiary] = useState<DiaryEntry[]>([]);
  const [filtered, setFiltered] = useState<DiaryEntry[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'rated' | 'unrated'>('all');

  useEffect(() => {
    loadDiary();
  }, []);

  useEffect(() => {
    applyFilter();
  }, [search, diary, selectedFilter]);

  const loadDiary = async () => {
    setLoading(true);
    const d = await getDiary();
    setDiary(d);
    setLoading(false);
  };

  const applyFilter = () => {
    let result = [...diary];

    if (selectedFilter === 'rated') result = result.filter(e => e.stars > 0);
    else if (selectedFilter === 'unrated') result = result.filter(e => e.stars === 0);

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(e => e.movieTitle.toLowerCase().includes(q));
    }

    setFiltered(result);
  };

  const filters: { key: typeof selectedFilter; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'rated', label: 'Com nota' },
    { key: 'unrated', label: 'Sem nota' },
  ];

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Diário</Text>
        <Text style={styles.headerCount}>{filtered.length} filmes</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar filme..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={styles.clearSearch}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {filters.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, selectedFilter === f.key && styles.filterChipActive]}
            onPress={() => setSelectedFilter(f.key)}
          >
            <Text style={[styles.filterText, selectedFilter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            {diary.length === 0
              ? 'Sincronize seus dados na aba Recap.'
              : 'Nenhum filme encontrado.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, idx) => `${item.letterboxdUri}-${idx}`}
          renderItem={({ item }) => <EntryItem item={item} />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: Typography.xl,
    fontFamily: Typography.fontBold,
    color: Colors.text,
  },
  headerCount: {
    fontSize: Typography.sm,
    fontFamily: Typography.fontMedium,
    color: Colors.textMuted,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface2,
    marginHorizontal: Spacing.screenPadding,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    height: 44,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  searchIcon: { fontSize: 14 },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontFamily: Typography.fontRegular,
    fontSize: Typography.base,
  },
  clearSearch: { color: Colors.textMuted, fontSize: Typography.base, paddingHorizontal: 4 },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: Spacing.md,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface1,
  },
  filterChipActive: {
    backgroundColor: Colors.accentDim,
    borderColor: 'rgba(204,255,0,0.3)',
  },
  filterText: {
    fontSize: Typography.sm,
    fontFamily: Typography.fontMedium,
    color: Colors.textMuted,
  },
  filterTextActive: { color: Colors.accent },
  list: { paddingHorizontal: Spacing.screenPadding, paddingBottom: 40 },
  sep: { height: 1, backgroundColor: Colors.border, marginVertical: 4 },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  poster: {
    width: 56,
    height: 84,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface2,
  },
  entryInfo: { flex: 1 },
  title: {
    fontSize: Typography.base,
    fontFamily: Typography.fontSemiBold,
    color: Colors.text,
    lineHeight: 20,
  },
  year: {
    fontSize: Typography.sm,
    fontFamily: Typography.fontRegular,
    color: Colors.textMuted,
    marginTop: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  stars: {
    fontSize: Typography.sm,
    color: Colors.accent,
    fontFamily: Typography.fontRegular,
  },
  noRating: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
    fontFamily: Typography.fontRegular,
  },
  date: {
    fontSize: Typography.xs,
    fontFamily: Typography.fontRegular,
    color: Colors.textMuted,
  },
  emptyText: {
    fontSize: Typography.base,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: Spacing['3xl'],
  },
});
