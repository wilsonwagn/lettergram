import { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Dimensions } from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';
import { RecapData } from '../services/letterboxd';

const { width } = Dimensions.get('window');
const CARD_W = width - Spacing.screenPadding * 2;

interface Props {
  recap: RecapData;
  username: string;
}

export function RecapShareCard({ recap, username }: Props) {
  const viewShotRef = useRef<ViewShot>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!viewShotRef.current) return;
    setSaving(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'Precisamos de acesso à galeria para salvar a imagem.');
        return;
      }
      const uri = await (viewShotRef.current as any).capture();
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('✅ Salvo!', 'Recap salvo na sua galeria!');
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    if (!viewShotRef.current) return;
    setSaving(true);
    try {
      const uri = await (viewShotRef.current as any).capture();
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Compartilhar Recap' });
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível compartilhar.');
    } finally {
      setSaving(false);
    }
  };

  const topByMonth = recap.monthlyBreakdown.reduce((a, b) => a.count > b.count ? a : b, { month: '-', count: 0 });
  const maxCount = Math.max(...recap.monthlyBreakdown.map(m => m.count), 1);

  return (
    <View style={styles.outer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recap para compartilhar</Text>
      </View>

      {/* The card that will be captured */}
      <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1.0 }}>
        <View style={styles.card}>
          <LinearGradient
            colors={['#0F1A00', '#0A0A0A', '#001A10']}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />

          {/* Glow */}
          <View style={styles.glow} />

          {/* Header */}
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardBrand}>LetterGram</Text>
              <Text style={styles.cardYear}>Recap {recap.year}</Text>
            </View>
            <Text style={styles.cardUsername}>@{username}</Text>
          </View>

          {/* Big number */}
          <View style={styles.bigStat}>
            <Text style={styles.bigNumber}>{recap.totalFilms}</Text>
            <Text style={styles.bigLabel}>filmes assistidos</Text>
          </View>

          {/* Mini stats */}
          <View style={styles.miniRow}>
            <View style={styles.miniStat}>
              <Text style={styles.miniValue}>
                {recap.averageRating > 0 ? `★ ${recap.averageRating.toFixed(1)}` : '—'}
              </Text>
              <Text style={styles.miniLabel}>média</Text>
            </View>
            <View style={styles.miniDivider} />
            <View style={styles.miniStat}>
              <Text style={styles.miniValue}>{recap.mostActiveMonth || '—'}</Text>
              <Text style={styles.miniLabel}>mês mais ativo</Text>
            </View>
          </View>

          {/* Top films */}
          {recap.topFilms.length > 0 && (
            <View style={styles.topFilmsSection}>
              <Text style={styles.topFilmsLabel}>Top filmes do ano</Text>
              {recap.topFilms.slice(0, 3).map((f, i) => (
                <View key={i} style={styles.topFilmRow}>
                  <Text style={styles.topFilmRank}>{i + 1}</Text>
                  <Text style={styles.topFilmTitle} numberOfLines={1}>{f.movieTitle}</Text>
                  <Text style={styles.topFilmStars}>{'★'.repeat(Math.floor(f.stars))}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Mini bar chart */}
          <View style={styles.miniChart}>
            {recap.monthlyBreakdown.filter(m => m.count > 0).map((m, i) => (
              <View key={i} style={styles.miniBarWrap}>
                <View
                  style={[
                    styles.miniBar,
                    { height: Math.max(4, (m.count / maxCount) * 32) },
                  ]}
                />
              </View>
            ))}
          </View>

          {/* Footer */}
          <Text style={styles.cardFooter}>letterboxd.com/{username}</Text>
        </View>
      </ViewShot>

      {/* Action buttons */}
      <View style={styles.btnRow}>
        <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color={Colors.accent} size="small" /> : <Text style={styles.btnOutlineText}>⬇ Salvar</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={handleShare} disabled={saving}>
          <Text style={styles.btnText}>↗ Compartilhar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { marginBottom: Spacing.xl },
  sectionHeader: { marginBottom: Spacing.md },
  sectionTitle: { fontSize: Typography.lg, fontFamily: Typography.fontBold, color: Colors.text },
  card: {
    width: CARD_W,
    borderRadius: Radius['2xl'],
    padding: Spacing.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(204,255,0,0.15)',
    gap: Spacing.lg,
  },
  glow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(204,255,0,0.06)',
    top: -60,
    right: -40,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardBrand: { fontSize: Typography.xs, fontFamily: Typography.fontBold, color: Colors.accent, letterSpacing: 2, textTransform: 'uppercase' },
  cardYear: { fontSize: Typography.sm, fontFamily: Typography.fontSemiBold, color: Colors.textSecondary, marginTop: 2 },
  cardUsername: { fontSize: Typography.sm, fontFamily: Typography.fontMedium, color: Colors.textMuted },
  bigStat: { alignItems: 'center', paddingVertical: Spacing.sm },
  bigNumber: { fontSize: 72, fontFamily: Typography.fontBlack, color: Colors.accent, lineHeight: 76 },
  bigLabel: { fontSize: Typography.base, fontFamily: Typography.fontRegular, color: Colors.textMuted },
  miniRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.xl },
  miniStat: { alignItems: 'center' },
  miniValue: { fontSize: Typography.xl, fontFamily: Typography.fontBold, color: Colors.text },
  miniLabel: { fontSize: Typography.xs, fontFamily: Typography.fontRegular, color: Colors.textMuted, marginTop: 2 },
  miniDivider: { width: 1, backgroundColor: Colors.border },
  topFilmsSection: { gap: Spacing.sm },
  topFilmsLabel: { fontSize: Typography.xs, fontFamily: Typography.fontSemiBold, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  topFilmRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  topFilmRank: { fontSize: Typography.sm, fontFamily: Typography.fontBold, color: Colors.accent, width: 16 },
  topFilmTitle: { flex: 1, fontSize: Typography.sm, fontFamily: Typography.fontMedium, color: Colors.text },
  topFilmStars: { fontSize: Typography.sm, color: Colors.accent },
  miniChart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 4, height: 36 },
  miniBarWrap: { alignItems: 'center' },
  miniBar: { width: 6, backgroundColor: Colors.accent, borderRadius: 3, opacity: 0.7 },
  cardFooter: { fontSize: Typography.xs, fontFamily: Typography.fontRegular, color: Colors.textMuted, textAlign: 'center' },
  btnRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  btn: { flex: 1, backgroundColor: Colors.accent, borderRadius: Radius.lg, height: 48, alignItems: 'center', justifyContent: 'center' },
  btnOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.accent },
  btnText: { fontSize: Typography.base, fontFamily: Typography.fontBold, color: '#000' },
  btnOutlineText: { fontSize: Typography.base, fontFamily: Typography.fontBold, color: Colors.accent },
});
