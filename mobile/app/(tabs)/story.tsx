import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Dimensions,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { fetchReview, ReviewData } from '../../services/letterboxd';

const { width } = Dimensions.get('window');
const CARD_RATIO = 9 / 16;
const CARD_W = width - Spacing.screenPadding * 2;
const CARD_H = CARD_W / CARD_RATIO;

const ACCENT_OPTIONS = ['#CCFF00', '#FF6B35', '#00E5FF', '#FF4D9D', '#B388FF', '#69FFA0'];

function StarDisplay({ stars }: { stars: number }) {
  const full = Math.floor(stars);
  const half = stars % 1 >= 0.5;
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Text key={i} style={{ fontSize: 16, color: '#CCFF00' }}>
          {i < full ? '★' : (i === full && half ? '⯨' : '☆')}
        </Text>
      ))}
    </View>
  );
}

export default function StoryScreen() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReviewData | null>(null);
  const [accent, setAccent] = useState(ACCENT_OPTIONS[0]);
  const [saving, setSaving] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);

  const handleFetch = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true);
    setData(null);
    try {
      const result = await fetchReview(trimmed);
      setData(result);
    } catch {
      Alert.alert(
        'Erro',
        'Não foi possível buscar a review.\n\nVerifique se o backend Python está rodando e se o link é de uma review válida do Letterboxd.'
      );
    } finally {
      setLoading(false);
    }
  };

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
      Alert.alert('✅ Salvo!', 'Imagem salva na sua galeria.');
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a imagem.');
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
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Compartilhar Story' });
      } else {
        Alert.alert('Não disponível', 'Compartilhamento não disponível neste dispositivo.');
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível compartilhar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Story</Text>
          <Text style={styles.headerSub}>Transforme sua review em arte</Text>
        </View>

        {/* URL Input */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Link da review no Letterboxd</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="https://letterboxd.com/user/film/..."
              placeholderTextColor={Colors.textMuted}
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={handleFetch}
              returnKeyType="go"
            />
          </View>
          <TouchableOpacity
            style={[styles.fetchBtn, loading && styles.fetchBtnDisabled]}
            onPress={handleFetch}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Text style={styles.fetchBtnText}>Gerar Story →</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Story Card Preview */}
        {data && (
          <>
            {/* Accent color picker */}
            <View style={styles.accentPicker}>
              <Text style={styles.accentLabel}>Cor de destaque</Text>
              <View style={styles.accentRow}>
                {ACCENT_OPTIONS.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.accentDot, { backgroundColor: c }, accent === c && styles.accentDotSelected]}
                    onPress={() => setAccent(c)}
                  />
                ))}
              </View>
            </View>

            {/* ViewShot card - this gets captured as image */}
            <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1.0 }} style={styles.storyWrap}>
              <View style={[styles.storyCard, { width: CARD_W, height: CARD_H }]}>
                {/* Background poster */}
                {data.posterBase64 ? (
                  <Image
                    source={{ uri: data.posterBase64 }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    blurRadius={2}
                  />
                ) : null}

                {/* Gradient overlay */}
                <LinearGradient
                  colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.95)']}
                  locations={[0, 0.4, 1]}
                  style={StyleSheet.absoluteFill}
                />

                {/* Content */}
                <View style={styles.storyContent}>
                  {/* Top: brand */}
                  <View style={styles.storyTop}>
                    <Text style={[styles.storyBrand, { color: accent }]}>LetterGram</Text>
                  </View>

                  {/* Middle: poster + info */}
                  <View style={styles.storyMiddle}>
                    {data.posterBase64 ? (
                      <Image
                        source={{ uri: data.posterBase64 }}
                        style={styles.storyPoster}
                        contentFit="cover"
                      />
                    ) : null}
                    <View style={styles.storyMeta}>
                      <Text style={styles.storyTitle} numberOfLines={3}>
                        {data.movieTitle}
                      </Text>
                      <StarDisplay stars={data.stars} />
                      {data.username ? (
                        <Text style={[styles.storyUser, { color: accent }]}>@{data.username}</Text>
                      ) : null}
                    </View>
                  </View>

                  {/* Review text */}
                  {data.reviewText ? (
                    <View style={[styles.reviewBubble, { borderLeftColor: accent }]}>
                      <Text style={styles.reviewText} numberOfLines={6}>
                        "{data.reviewText}"
                      </Text>
                    </View>
                  ) : null}

                  {/* Bottom: letterboxd attribution */}
                  <View style={styles.storyBottom}>
                    <View style={[styles.lbPill, { backgroundColor: accent }]}>
                      <Text style={styles.lbPillText}>via Letterboxd</Text>
                    </View>
                  </View>
                </View>
              </View>
            </ViewShot>

            {/* Action buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnOutline]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={Colors.accent} size="small" />
                ) : (
                  <Text style={styles.actionBtnOutlineText}>⬇ Salvar</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={handleShare}
                disabled={saving}
              >
                <Text style={styles.actionBtnText}>↗ Compartilhar</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.shareHint}>
              Toque em "Compartilhar" para enviar direto ao Instagram Stories, WhatsApp e mais.
            </Text>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.screenPadding, paddingTop: Spacing.lg },
  header: { marginBottom: Spacing.xl },
  headerTitle: { fontSize: Typography.xl, fontFamily: Typography.fontBold, color: Colors.text },
  headerSub: { fontSize: Typography.base, fontFamily: Typography.fontRegular, color: Colors.textMuted, marginTop: 2 },
  inputCard: {
    backgroundColor: Colors.surface1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  inputLabel: { fontSize: Typography.sm, fontFamily: Typography.fontSemiBold, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputRow: {
    backgroundColor: Colors.surface2,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    height: 48,
    justifyContent: 'center',
  },
  input: { fontSize: Typography.base, fontFamily: Typography.fontRegular, color: Colors.text },
  fetchBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.lg,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fetchBtnDisabled: { opacity: 0.6 },
  fetchBtnText: { fontSize: Typography.base, fontFamily: Typography.fontBold, color: '#000' },
  accentPicker: { marginBottom: Spacing.lg },
  accentLabel: { fontSize: Typography.sm, fontFamily: Typography.fontSemiBold, color: Colors.textMuted, marginBottom: Spacing.sm },
  accentRow: { flexDirection: 'row', gap: Spacing.sm },
  accentDot: { width: 28, height: 28, borderRadius: 14 },
  accentDotSelected: { borderWidth: 3, borderColor: '#fff' },
  storyWrap: { borderRadius: Radius.xl, overflow: 'hidden', marginBottom: Spacing.md },
  storyCard: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  storyContent: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  storyTop: { alignItems: 'flex-end' },
  storyBrand: { fontSize: 12, fontFamily: Typography.fontBold, letterSpacing: 2, textTransform: 'uppercase' },
  storyMiddle: { flexDirection: 'row', gap: 16, alignItems: 'flex-end' },
  storyPoster: { width: 80, height: 120, borderRadius: 8 },
  storyMeta: { flex: 1, gap: 8 },
  storyTitle: { fontSize: 22, fontFamily: Typography.fontBlack, color: '#fff', lineHeight: 26 },
  storyUser: { fontSize: 12, fontFamily: Typography.fontSemiBold },
  reviewBubble: {
    borderLeftWidth: 2,
    paddingLeft: 12,
  },
  reviewText: {
    fontSize: 13,
    fontFamily: Typography.fontRegular,
    color: 'rgba(255,255,255,0.8)',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  storyBottom: { alignItems: 'center' },
  lbPill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 100 },
  lbPillText: { fontSize: 10, fontFamily: Typography.fontBold, color: '#000' },
  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  actionBtn: {
    flex: 1,
    backgroundColor: Colors.accent,
    borderRadius: Radius.lg,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  actionBtnText: { fontSize: Typography.base, fontFamily: Typography.fontBold, color: '#000' },
  actionBtnOutlineText: { fontSize: Typography.base, fontFamily: Typography.fontBold, color: Colors.accent },
  shareHint: {
    fontSize: Typography.sm,
    fontFamily: Typography.fontRegular,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
