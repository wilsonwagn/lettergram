/**
 * LetterGram — Tela única, design premium.
 * Estado 1: Input centralizado (sem dados)
 * Estado 2: Preview do Story + download (com dados)
 */
import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, Dimensions, Platform,
  KeyboardAvoidingView, Keyboard, TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';
import { fetchReview, ReviewData } from '../services/letterboxd';

// ── Dimensões responsivas ──────────────────────────────────────────────────
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Preview: ocupa no máximo 52% da altura da tela, proporção 9:16
const PREVIEW_MAX_H = Math.min(SCREEN_H * 0.52, 480);
const PREVIEW_W = PREVIEW_MAX_H * (9 / 16);

// Paleta de cores de destaque
const ACCENT_OPTIONS = [
  { color: '#CCFF00', label: 'Lima' },
  { color: '#FF6B35', label: 'Tangerina' },
  { color: '#00E5FF', label: 'Cyan' },
  { color: '#FF4D9D', label: 'Rosa' },
  { color: '#B388FF', label: 'Lavanda' },
  { color: '#69FFA0', label: 'Menta' },
];

const REVIEW_CHUNK_SIZE = 200;

/** Estrelas visuais */
function StarDisplay({ stars, accent }: { stars: number; accent: string }) {
  const full = Math.floor(stars);
  const half = stars % 1 >= 0.5;
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Text key={i} style={{ fontSize: 14, color: accent }}>
          {i < full ? '★' : (i === full && half ? '⯨' : '☆')}
        </Text>
      ))}
    </View>
  );
}

/** Quebra o texto da review em pedaços */
function splitReviewText(text: string): string[] {
  if (!text || text.length <= REVIEW_CHUNK_SIZE) return [text];
  const paragraphs = text.split('\n\n').filter(p => p.trim());
  if (paragraphs.length > 1) return paragraphs;
  const chunks: string[] = [];
  let current = '';
  const sentences = text.split(/(?<=[.!?])\s+/);
  for (const sentence of sentences) {
    if (current.length + sentence.length > REVIEW_CHUNK_SIZE && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += (current ? ' ' : '') + sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [text];
}

export default function StoryScreen() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReviewData | null>(null);
  const [accent, setAccent] = useState(ACCENT_OPTIONS[0].color);
  const [saving, setSaving] = useState(false);
  const [selectedChunk, setSelectedChunk] = useState(0);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);

  // Animações
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const reviewChunks = data ? splitReviewText(data.reviewText) : [];
  const displayText = reviewChunks.length > 0 ? reviewChunks[selectedChunk] ?? '' : '';

  // Anima entrada do preview
  useEffect(() => {
    if (data) {
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [data]);

  /** Busca os dados da review via backend */
  const handleFetch = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      Alert.alert('Link vazio', 'Cole o link de uma review do Letterboxd.');
      return;
    }
    Keyboard.dismiss();
    setLoading(true);
    setData(null);
    setSelectedChunk(0);
    setDownloadSuccess(false);
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

  /** Baixa a imagem do Story na galeria */
  const handleDownload = async () => {
    if (!viewShotRef.current) return;
    setSaving(true);
    setDownloadSuccess(false);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'Precisamos de acesso à galeria para salvar a imagem.');
        return;
      }
      const uri = await (viewShotRef.current as any).capture();
      await MediaLibrary.saveToLibraryAsync(uri);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a imagem.');
    } finally {
      setSaving(false);
    }
  };

  /** Volta para o estado inicial */
  const handleReset = () => {
    setData(null);
    setUrl('');
    setSelectedChunk(0);
    setDownloadSuccess(false);
  };

  // ════════════════════════════════════════════════════
  // ESTADO 1: Sem dados — tela de input centralizada
  // ════════════════════════════════════════════════════
  if (!data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            style={styles.centeredContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            {/* Glow decorativo de fundo */}
            <View style={styles.bgGlow} />
            <View style={styles.bgGlow2} />

            {/* Conteúdo centralizado */}
            <View style={styles.centeredContent}>
              {/* Logo */}
              <View style={styles.logoArea}>
                <View style={styles.logoIcon}>
                  <View style={styles.logoLens} />
                </View>
                <Text style={styles.logoText}>
                  Letter<Text style={styles.logoAccent}>gram</Text>
                </Text>
                <Text style={styles.logoSub}>Reviews em arte</Text>
              </View>

              {/* Input card com glassmorphism */}
              <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>LINK DA REVIEW</Text>
                <TextInput
                  style={styles.input}
                  placeholder="letterboxd.com/user/film/..."
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={url}
                  onChangeText={setUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onSubmitEditing={handleFetch}
                  returnKeyType="go"
                  selectTextOnFocus
                />
                <TouchableOpacity
                  style={[styles.generateBtn, loading && styles.generateBtnLoading]}
                  onPress={handleFetch}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator color="#000" size="small" />
                      <Text style={styles.generateBtnText}>Gerando...</Text>
                    </View>
                  ) : (
                    <Text style={styles.generateBtnText}>Gerar Story</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Dica sutil */}
              <Text style={styles.hint}>
                Cole o link de uma review do Letterboxd{'\n'}e transforme em um Story para Instagram
              </Text>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    );
  }

  // ════════════════════════════════════════════════════
  // ESTADO 2: Com dados — preview + download
  // ════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.previewContainer}>
        {/* Header compacto com botão de voltar */}
        <View style={styles.previewHeader}>
          <TouchableOpacity onPress={handleReset} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Novo</Text>
          </TouchableOpacity>
          <Text style={styles.previewHeaderTitle}>
            Letter<Text style={styles.logoAccent}>gram</Text>
          </Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Picker de cor */}
        <View style={styles.accentRow}>
          {ACCENT_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.color}
              style={[
                styles.accentDot,
                { backgroundColor: opt.color },
                accent === opt.color && styles.accentDotActive,
              ]}
              onPress={() => setAccent(opt.color)}
              activeOpacity={0.7}
            />
          ))}
        </View>

        {/* Preview do Story (animado) */}
        <Animated.View
          style={[
            styles.previewArea,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <ViewShot
            ref={viewShotRef}
            options={{ format: 'png', quality: 1.0 }}
            style={styles.viewShotWrap}
          >
            <View style={[styles.storyCard, { width: PREVIEW_W, height: PREVIEW_MAX_H }]}>
              {/* Background: poster blur */}
              {data.posterBase64 ? (
                <Image
                  source={{ uri: data.posterBase64 }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  blurRadius={3}
                />
              ) : null}

              {/* Overlay gradient */}
              <LinearGradient
                colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.95)']}
                locations={[0, 0.35, 1]}
                style={StyleSheet.absoluteFill}
              />

              {/* Conteúdo */}
              <View style={styles.storyContent}>
                <View style={styles.storyTop}>
                  <Text style={[styles.storyBrand, { color: accent }]}>LetterGram</Text>
                </View>

                <View style={styles.storyMiddle}>
                  {data.posterBase64 ? (
                    <Image
                      source={{ uri: data.posterBase64 }}
                      style={styles.storyPoster}
                      contentFit="cover"
                    />
                  ) : null}
                  <View style={styles.storyMeta}>
                    <Text style={styles.storyTitle} numberOfLines={2}>
                      {data.movieTitle}
                    </Text>
                    <StarDisplay stars={data.stars} accent={accent} />
                    {data.username ? (
                      <Text style={[styles.storyUser, { color: accent }]}>
                        @{data.username}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {displayText ? (
                  <View style={[styles.reviewBubble, { borderLeftColor: accent }]}>
                    <Text style={styles.reviewText} numberOfLines={5}>
                      "{displayText}"
                    </Text>
                  </View>
                ) : null}

                <View style={styles.storyBottom}>
                  <View style={[styles.lbPill, { backgroundColor: accent }]}>
                    <Text style={styles.lbPillText}>via Letterboxd</Text>
                  </View>
                </View>
              </View>
            </View>
          </ViewShot>

          {/* Navegação de trechos */}
          {reviewChunks.length > 1 && (
            <View style={styles.chunkNav}>
              <TouchableOpacity
                onPress={() => setSelectedChunk(Math.max(0, selectedChunk - 1))}
                disabled={selectedChunk === 0}
                style={[styles.chunkArrow, selectedChunk === 0 && styles.chunkArrowDisabled]}
              >
                <Text style={styles.chunkArrowText}>‹</Text>
              </TouchableOpacity>
              <View style={styles.chunkDots}>
                {reviewChunks.map((_, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setSelectedChunk(i)}
                    style={[
                      styles.chunkDot,
                      i === selectedChunk && { backgroundColor: accent },
                    ]}
                  />
                ))}
              </View>
              <TouchableOpacity
                onPress={() => setSelectedChunk(Math.min(reviewChunks.length - 1, selectedChunk + 1))}
                disabled={selectedChunk >= reviewChunks.length - 1}
                style={[styles.chunkArrow, selectedChunk >= reviewChunks.length - 1 && styles.chunkArrowDisabled]}
              >
                <Text style={styles.chunkArrowText}>›</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        {/* Botão de download */}
        <TouchableOpacity
          style={[
            styles.downloadBtn,
            { shadowColor: accent, backgroundColor: accent },
            downloadSuccess && styles.downloadBtnSuccess,
            saving && styles.downloadBtnSaving,
          ]}
          onPress={handleDownload}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#000" size="small" />
          ) : downloadSuccess ? (
            <Text style={styles.downloadBtnText}>✓ Salvo na galeria</Text>
          ) : (
            <Text style={styles.downloadBtnText}>Baixar Imagem</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#050505',
  },

  // ══════════════════════════════════════════
  // ESTADO 1: Tela centralizada (sem dados)
  // ══════════════════════════════════════════
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  bgGlow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(204,255,0,0.03)',
    top: SCREEN_H * 0.15,
    left: -60,
  },
  bgGlow2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(204,255,0,0.02)',
    bottom: SCREEN_H * 0.15,
    right: -40,
  },
  centeredContent: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },

  // Logo
  logoArea: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoIcon: {
    width: 48,
    height: 38,
    borderWidth: 1.5,
    borderColor: 'rgba(204,255,0,0.4)',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoLens: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(204,255,0,0.5)',
    backgroundColor: 'rgba(204,255,0,0.08)',
  },
  logoText: {
    fontSize: 32,
    fontFamily: Typography.fontBlack,
    color: '#fff',
    letterSpacing: -1,
  },
  logoAccent: {
    color: Colors.accent,
  },
  logoSub: {
    fontSize: 11,
    fontFamily: Typography.fontMedium,
    color: 'rgba(255,255,255,0.25)',
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginTop: 6,
  },

  // Input card
  inputCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 20,
    gap: 14,
  },
  inputLabel: {
    fontSize: 10,
    fontFamily: Typography.fontSemiBold,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 2,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 14,
    fontFamily: Typography.fontRegular,
    color: '#fff',
  },
  generateBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    // Glow sutil
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  generateBtnLoading: {
    opacity: 0.8,
  },
  generateBtnText: {
    fontSize: 15,
    fontFamily: Typography.fontBold,
    color: '#000',
    letterSpacing: 0.3,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hint: {
    marginTop: 24,
    fontSize: 12,
    fontFamily: Typography.fontRegular,
    color: 'rgba(255,255,255,0.15)',
    textAlign: 'center',
    lineHeight: 18,
  },

  // ══════════════════════════════════════════
  // ESTADO 2: Preview (com dados)
  // ══════════════════════════════════════════
  previewContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // Header
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingBottom: 8,
  },
  backBtn: {
    paddingVertical: 6,
    paddingRight: 12,
  },
  backBtnText: {
    fontSize: 13,
    fontFamily: Typography.fontSemiBold,
    color: 'rgba(255,255,255,0.5)',
  },
  previewHeaderTitle: {
    fontSize: 16,
    fontFamily: Typography.fontBold,
    color: '#fff',
    letterSpacing: -0.3,
  },

  // Accent picker
  accentRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  accentDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    opacity: 0.6,
  },
  accentDotActive: {
    opacity: 1,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    // Glow
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },

  // Preview
  previewArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewShotWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    // Shadow do card
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  storyCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0a0a0a',
  },
  storyContent: {
    flex: 1,
    padding: 18,
    justifyContent: 'space-between',
  },
  storyTop: {
    alignItems: 'flex-end',
  },
  storyBrand: {
    fontSize: 9,
    fontFamily: Typography.fontBold,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    opacity: 0.8,
  },
  storyMiddle: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-end',
  },
  storyPoster: {
    width: 60,
    height: 90,
    borderRadius: 6,
  },
  storyMeta: {
    flex: 1,
    gap: 4,
  },
  storyTitle: {
    fontSize: 17,
    fontFamily: Typography.fontBlack,
    color: '#fff',
    lineHeight: 21,
  },
  storyUser: {
    fontSize: 10,
    fontFamily: Typography.fontSemiBold,
    opacity: 0.8,
  },
  reviewBubble: {
    borderLeftWidth: 2,
    paddingLeft: 10,
  },
  reviewText: {
    fontSize: 11,
    fontFamily: Typography.fontRegular,
    color: 'rgba(255,255,255,0.75)',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  storyBottom: {
    alignItems: 'center',
  },
  lbPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 100,
  },
  lbPillText: {
    fontSize: 8,
    fontFamily: Typography.fontBold,
    color: '#000',
    letterSpacing: 0.5,
  },

  // Chunk navigation
  chunkNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  chunkArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chunkArrowDisabled: {
    opacity: 0.2,
  },
  chunkArrowText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: Typography.fontBold,
  },
  chunkDots: {
    flexDirection: 'row',
    gap: 5,
  },
  chunkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  // Download button
  downloadBtn: {
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  downloadBtnSuccess: {
    backgroundColor: '#00E096',
    shadowColor: '#00E096',
  },
  downloadBtnSaving: {
    opacity: 0.7,
  },
  downloadBtnText: {
    fontSize: 15,
    fontFamily: Typography.fontBold,
    color: '#000',
    letterSpacing: 0.3,
  },
});
