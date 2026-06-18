/**
 * LetterGram — Tela principal.
 * Estado 1: Input centralizado (sem dados) → InputScreen
 * Estado 2: Preview do Story + download (com dados)
 */
import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Animated, ScrollView, Linking,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';
import { Colors, Typography } from '../constants/theme';
import { ACCENT_OPTIONS, type TextAlignOption } from '../constants/storyConfig';
import { fetchReview, type ReviewData } from '../services/letterboxd';
import { InputScreen } from '../components/InputScreen';
import { StoryCard } from '../components/StoryCard';
import { AccentPicker } from '../components/AccentPicker';
import { ToolsBar } from '../components/ToolsBar';
import { DarknessSlider } from '../components/DarknessSlider';
import { useReviewChunks } from '../hooks/useReviewChunks';
import { useStoryDownload } from '../hooks/useStoryDownload';

/** Valida se a URL é do Letterboxd (direta ou encurtada boxd.it) */
function isLetterboxdUrl(rawUrl: string): boolean {
  let normalized = rawUrl.trim().toLowerCase();
  normalized = normalized.replace(/^https?:\/\//, '');
  normalized = normalized.replace(/^www\./, '');
  return (
    normalized.startsWith('letterboxd.com/') ||
    normalized.startsWith('boxd.it/') ||
    normalized === 'letterboxd.com' ||
    normalized === 'boxd.it'
  );
}

export default function StoryScreen() {
  // ── Estado principal ────────────────────────────────────
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReviewData | null>(null);

  // ── Configurações do editor ─────────────────────────────
  const [accent, setAccent] = useState<string>(ACCENT_OPTIONS[0].color);
  const [showLetterboxd, setShowLetterboxd] = useState(true);
  const [fontSizeOffset, setFontSizeOffset] = useState(0);
  const [titleSizeOffset, setTitleSizeOffset] = useState(0);
  const [userSizeOffset, setUserSizeOffset] = useState(0);
  const [stickerMode, setStickerMode] = useState(0);
  const [textAlign, setTextAlign] = useState<TextAlignOption>('justify');
  const [isBold, setIsBold] = useState(false);
  const [overflowWarning, setOverflowWarning] = useState(false);
  const [darknessLevel, setDarknessLevel] = useState(55);

  // ── Hooks customizados ──────────────────────────────────
  const isSticker = stickerMode > 0;
  const isSolid = stickerMode >= 4;

  const reviewChunks = useReviewChunks(data?.reviewText ?? '');

  const download = useStoryDownload({
    movieTitle: data?.movieTitle,
    posterBase64: data?.posterBase64,
    isSticker,
    isSolid,
  });

  // ── Animações ───────────────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Overflow warning
  useEffect(() => {
    setOverflowWarning(fontSizeOffset >= 6 && reviewChunks.displayText.length > 300);
  }, [fontSizeOffset, reviewChunks.displayText]);

  // Anima entrada do preview
  useEffect(() => {
    if (data) {
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    }
  }, [data]);

  // ── Handlers ────────────────────────────────────────────

  /** Busca os dados da review via backend */
  const handleFetch = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      Alert.alert('Link vazio', 'Cole o link de uma review do Letterboxd.');
      return;
    }
    if (!isLetterboxdUrl(trimmed)) {
      Alert.alert(
        '🔗 Link inválido',
        'Por favor, insira apenas links do Letterboxd.\n\nExemplos válidos:\n• letterboxd.com/user/film/...\n• boxd.it/abc123'
      );
      return;
    }
    Keyboard.dismiss();
    setLoading(true);
    setData(null);
    reviewChunks.reset();
    download.resetSuccess();
    try {
      const result = await fetchReview(trimmed);
      setData(result);
    } catch (err: any) {
      const isNetwork = err?.message?.includes('Network') || err?.code === 'ERR_NETWORK';
      Alert.alert(
        isNetwork ? '🔌 Backend offline' : 'Erro',
        isNetwork
          ? 'O servidor não está respondendo.\n\nAbra outro terminal e rode:\nmake backend'
          : 'Não foi possível buscar a review.\nVerifique se o link é válido.'
      );
    } finally {
      setLoading(false);
    }
  };

  /** Volta para o estado inicial */
  const handleReset = () => {
    setData(null);
    setUrl('');
    reviewChunks.reset();
    download.resetSuccess();
  };

  // ════════════════════════════════════════════════════
  // ESTADO 1: Sem dados — tela de input
  // ════════════════════════════════════════════════════
  if (!data) {
    return (
      <InputScreen
        url={url}
        loading={loading}
        onUrlChange={setUrl}
        onSubmit={handleFetch}
      />
    );
  }

  // ════════════════════════════════════════════════════
  // ESTADO 2: Com dados — preview + download
  // ════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* Header compacto */}
        <View style={styles.previewHeader}>
          <TouchableOpacity onPress={handleReset} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Novo</Text>
          </TouchableOpacity>
          <Text style={styles.previewHeaderTitle}>
            Letter<Text style={styles.logoAccent}>gram</Text>
          </Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Controles */}
        <AccentPicker accent={accent} onSelect={setAccent} />
        <ToolsBar
          stickerMode={stickerMode}
          showLetterboxd={showLetterboxd}
          fontSizeOffset={fontSizeOffset}
          titleSizeOffset={titleSizeOffset}
          userSizeOffset={userSizeOffset}
          textAlign={textAlign}
          isBold={isBold}
          accent={accent}
          onStickerModeChange={setStickerMode}
          onToggleLetterboxd={() => setShowLetterboxd(!showLetterboxd)}
          onFontSizeChange={setFontSizeOffset}
          onTitleSizeChange={setTitleSizeOffset}
          onUserSizeChange={setUserSizeOffset}
          onTextAlignChange={setTextAlign}
          onToggleBold={() => setIsBold(!isBold)}
        />

        {/* Slider de escurecimento — apenas modo Normal */}
        {stickerMode === 0 && (
          <DarknessSlider
            value={darknessLevel}
            onChange={setDarknessLevel}
            accent={accent}
          />
        )}

        {/* Overflow warning */}
        {overflowWarning && (
          <View style={styles.warningBar}>
            <Text style={styles.warningText}>O texto pode ultrapassar a margem do card com essa fonte.</Text>
          </View>
        )}

        {/* Preview do Story */}
        <Animated.View style={[styles.previewArea, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <ViewShot
            ref={download.viewShotRef}
            options={{ format: 'png', quality: 1.0 } as any}
            style={[styles.viewShotWrap, isSticker && !isSolid && { backgroundColor: 'transparent', elevation: 0, shadowOpacity: 0 }]}
          >
            <StoryCard
              data={data}
              displayText={reviewChunks.displayText}
              accent={accent}
              stickerMode={stickerMode}
              showLetterboxd={showLetterboxd}
              fontSizeOffset={fontSizeOffset}
              titleSizeOffset={titleSizeOffset}
              userSizeOffset={userSizeOffset}
              textAlign={textAlign}
              isBold={isBold}
              isSticker={isSticker}
              darknessLevel={darknessLevel}
            />
          </ViewShot>

          {/* Navegação de trechos */}
          {reviewChunks.hasMultipleChunks && (
            <View style={styles.chunkNav}>
              <TouchableOpacity
                onPress={reviewChunks.goPrev}
                disabled={reviewChunks.isFirst}
                style={[styles.chunkArrow, reviewChunks.isFirst && styles.chunkArrowDisabled]}
              >
                <Text style={styles.chunkArrowText}>‹</Text>
              </TouchableOpacity>
              <View style={styles.chunkDots}>
                {reviewChunks.chunks.map((_, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => reviewChunks.goTo(i)}
                    style={[styles.chunkDot, i === reviewChunks.selectedChunk && { backgroundColor: accent }]}
                  />
                ))}
              </View>
              <TouchableOpacity
                onPress={reviewChunks.goNext}
                disabled={reviewChunks.isLast}
                style={[styles.chunkArrow, reviewChunks.isLast && styles.chunkArrowDisabled]}
              >
                <Text style={styles.chunkArrowText}>›</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        {/* Botões de ação */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.downloadBtn, { shadowColor: accent, backgroundColor: accent }, download.downloadSuccess && styles.downloadBtnSuccess, download.saving && styles.downloadBtnSaving]}
            onPress={download.handleDownload}
            disabled={download.saving}
            activeOpacity={0.85}
          >
            {download.saving ? (
              <ActivityIndicator color="#000" size="small" />
            ) : download.downloadSuccess ? (
              <Text style={styles.downloadBtnText}>✓ Salvo na galeria</Text>
            ) : (
              <Text style={styles.downloadBtnText}>Baixar Imagem</Text>
            )}
          </TouchableOpacity>

          <View style={styles.secondaryBtns}>
            <TouchableOpacity
              style={[styles.secondaryBtn, download.posterDownloadSuccess && { backgroundColor: '#00E096', borderColor: '#00E096' }]}
              onPress={download.handleDownloadPoster}
              disabled={download.savingPoster}
              activeOpacity={0.85}
            >
              {download.savingPoster ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : download.posterDownloadSuccess ? (
                <Text style={styles.secondaryBtnText}>✓ Capa salva</Text>
              ) : (
                <Text style={styles.secondaryBtnText}>Baixar Capa</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryBtn, styles.instagramBtn]}
              onPress={download.handleShareInstagram}
              disabled={download.sharingStory}
              activeOpacity={0.85}
            >
              {download.sharingStory ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.secondaryBtnText}>Compartilhar nos Stories</Text>
                  <Text style={styles.instagramLabel}>Instagram</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Crédito */}
        <TouchableOpacity style={styles.creditFooterPreview} onPress={() => Linking.openURL('https://wilsonwagn.vercel.app/')} activeOpacity={0.6}>
          <Text style={styles.creditTextSmall}>
            feito por <Text style={styles.creditName}>Wilson Wagner</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles (apenas Estado 2 — Estado 1 está no InputScreen) ─────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#050505' },

  // Header
  previewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, paddingBottom: 8 },
  backBtn: { paddingVertical: 6, paddingRight: 12 },
  backBtnText: { fontSize: 13, fontFamily: Typography.fontSemiBold, color: 'rgba(255,255,255,0.5)' },
  previewHeaderTitle: { fontSize: 16, fontFamily: Typography.fontBold, color: '#fff', letterSpacing: -0.3 },
  logoAccent: { color: Colors.accent },

  // Warning bar
  warningBar: { backgroundColor: 'rgba(255,170,0,0.1)', borderWidth: 1, borderColor: 'rgba(255,170,0,0.2)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginTop: 4 },
  warningText: { color: 'rgba(255,170,0,0.8)', fontSize: 10, fontFamily: Typography.fontRegular, textAlign: 'center' },

  // Preview
  previewArea: { alignItems: 'center', paddingVertical: 12 },
  viewShotWrap: { overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10 },

  // Chunk navigation
  chunkNav: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  chunkArrow: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  chunkArrowDisabled: { opacity: 0.2 },
  chunkArrowText: { fontSize: 16, color: 'rgba(255,255,255,0.6)', fontFamily: Typography.fontBold },
  chunkDots: { flexDirection: 'row', gap: 5 },
  chunkDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.12)' },

  // Action buttons
  actionButtons: { gap: 8, marginTop: 8 },
  downloadBtn: {
    borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  downloadBtnSuccess: { backgroundColor: '#00E096', shadowColor: '#00E096' },
  downloadBtnSaving: { opacity: 0.7 },
  downloadBtnText: { fontSize: 15, fontFamily: Typography.fontBold, color: '#000', letterSpacing: 0.3 },

  // Secondary buttons
  secondaryBtns: { flexDirection: 'row', gap: 8 },
  secondaryBtn: { flex: 1, borderRadius: 12, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  instagramBtn: { borderColor: 'rgba(225,48,108,0.25)', backgroundColor: 'rgba(225,48,108,0.08)' },
  secondaryBtnText: { fontSize: 11, fontFamily: Typography.fontSemiBold, color: 'rgba(255,255,255,0.8)' },
  instagramLabel: { fontSize: 7, fontFamily: Typography.fontRegular, color: 'rgba(255,255,255,0.3)', marginTop: 1 },

  // Credit
  creditFooterPreview: { paddingVertical: 8, alignItems: 'center' },
  creditTextSmall: { fontSize: 9, fontFamily: Typography.fontRegular, color: 'rgba(255,255,255,0.15)' },
  creditName: { fontFamily: Typography.fontSemiBold, color: 'rgba(255,255,255,0.35)', textDecorationLine: 'underline' },
});
