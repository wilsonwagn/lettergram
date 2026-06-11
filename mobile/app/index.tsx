/**
 * LetterGram — Tela única, design premium.
 * Estado 1: Input centralizado (sem dados)
 * Estado 2: Preview do Story + download (com dados)
 */
import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, Dimensions, Platform,
  KeyboardAvoidingView, Keyboard,
  Animated, ScrollView, Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import ViewShot from 'react-native-view-shot';
import { FontAwesome } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
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
  { color: '#FFFFFF', label: 'Branco' },
  { color: '#FFD700', label: 'Amarelo' },
];

const REVIEW_CHUNK_SIZE = 700;

// Modos de visualização
const STICKER_MODES = [
  'Normal',
  'Sticker: Clean',
  'Sticker: Glass',
  'Sticker: Box',
  'Solid: Branco',
  'Solid: Cinza',
  'Solid: Preto',
];

// Alinhamento de texto
const ALIGN_OPTIONS: Array<'left' | 'center' | 'right' | 'justify'> = ['justify', 'left', 'center', 'right'];
const ALIGN_LABELS: Record<string, string> = { justify: 'Justificado', left: 'Esquerda', center: 'Centro', right: 'Direita' };

/** Valida se a URL é do Letterboxd (direta ou encurtada boxd.it) */
function isLetterboxdUrl(rawUrl: string): boolean {
  let normalized = rawUrl.trim().toLowerCase();
  normalized = normalized.replace(/^https?:\/\//, '');
  normalized = normalized.replace(/^www\./, '');
  return normalized.startsWith('letterboxd.com/') || normalized.startsWith('boxd.it/') || normalized === 'letterboxd.com' || normalized === 'boxd.it';
}

/** Remove o ano (YYYY) do título do filme */
function stripYear(title: string): string {
  return title.replace(/\s*\(\d{4}\)\s*$/, '').trim();
}

/** Estrelas visuais com efeito neon */
function StarDisplay({ stars, accent }: { stars: number; accent: string }) {
  const full = Math.floor(stars);
  const half = stars % 1 !== 0;
  const neonStyle = Platform.OS === 'web'
    ? { textShadow: `0 0 4px ${accent}, 0 0 8px ${accent}, 0 0 16px ${accent}40` } as any
    : { textShadowColor: accent, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 };

  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Text key={i} style={[{ fontSize: 13, color: i < full ? accent : (i === full && half ? accent : 'rgba(255,255,255,0.15)') }, i < full || (i === full && half) ? neonStyle : {}]}>
          {i < full ? '★' : (i === full && half ? '★' : '☆')}
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
  const [savingPoster, setSavingPoster] = useState(false);
  const [selectedChunk, setSelectedChunk] = useState(0);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [posterDownloadSuccess, setPosterDownloadSuccess] = useState(false);
  const [showLetterboxd, setShowLetterboxd] = useState(true);
  const [fontSizeOffset, setFontSizeOffset] = useState(0);
  const [userSizeOffset, setUserSizeOffset] = useState(0);
  const [stickerMode, setStickerMode] = useState(0);
  const [sharingStory, setSharingStory] = useState(false);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right' | 'justify'>('justify');
  const [isBold, setIsBold] = useState(false);
  const [overflowWarning, setOverflowWarning] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);
  const inputRef = useRef<TextInput>(null);

  // Animações
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const reviewChunks = data ? splitReviewText(data.reviewText) : [];
  const displayText = reviewChunks.length > 0 ? reviewChunks[selectedChunk] ?? '' : '';

  // Detecta overflow potencial quando o texto é muito grande
  const isSticker = stickerMode > 0;
  const isSolid = stickerMode >= 4;
  const maxReviewLines = isSticker ? undefined : 15;

  useEffect(() => {
    // Alerta de overflow: quando font offset é alto e há texto longo
    if (fontSizeOffset >= 6 && displayText.length > 300) {
      setOverflowWarning(true);
    } else {
      setOverflowWarning(false);
    }
  }, [fontSizeOffset, displayText]);

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
    setSelectedChunk(0);
    setDownloadSuccess(false);
    setPosterDownloadSuccess(false);
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

  /** Baixa a imagem do Story na galeria ou no Web */
  const handleDownload = async () => {
    setSaving(true);
    setDownloadSuccess(false);
    try {
      let uri: string;
      if (Platform.OS === 'web') {
        const htmlToImage = await import('html-to-image');
        const domNode = document.getElementById('story-card');
        if (!domNode) throw new Error('DOM node not found');
        await new Promise(resolve => setTimeout(resolve, 300));
        uri = await htmlToImage.toPng(domNode, {
          cacheBust: true,
          pixelRatio: 4,
          style: isSticker && !isSolid ? { backgroundColor: 'transparent' } : {},
          filter: () => true,
        });
      } else {
        if (!viewShotRef.current) return;
        uri = await (viewShotRef.current as any).capture();
      }
      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.download = `lettergram-${data?.movieTitle.replace(/\s+/g, '-').toLowerCase() || 'story'}.png`;
        link.href = uri;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 3000);
      } else {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permissão negada', 'Precisamos de acesso à galeria para salvar a imagem.');
          return;
        }
        await MediaLibrary.saveToLibraryAsync(uri);
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 3000);
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a imagem.');
    } finally {
      setSaving(false);
    }
  };

  /** Baixa apenas a capa/poster do filme */
  const handleDownloadPoster = async () => {
    if (!data?.posterBase64) {
      Alert.alert('Sem capa', 'Nenhuma capa disponível para download.');
      return;
    }
    setSavingPoster(true);
    setPosterDownloadSuccess(false);
    try {
      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.download = `capa-${stripYear(data.movieTitle).replace(/\s+/g, '-').toLowerCase()}.jpg`;
        link.href = data.posterBase64;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setPosterDownloadSuccess(true);
        setTimeout(() => setPosterDownloadSuccess(false), 3000);
      } else {
        const base64Data = data.posterBase64.split(',')[1];
        const fileUri = FileSystem.cacheDirectory + `capa-${Date.now()}.jpg`;
        await FileSystem.writeAsStringAsync(fileUri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permissão negada', 'Precisamos de acesso à galeria para salvar a imagem.');
          return;
        }
        await MediaLibrary.saveToLibraryAsync(fileUri);
        setPosterDownloadSuccess(true);
        setTimeout(() => setPosterDownloadSuccess(false), 3000);
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível baixar a capa.');
    } finally {
      setSavingPoster(false);
    }
  };

  /** Compartilha nos Stories do Instagram */
  const handleShareInstagram = async () => {
    setSharingStory(true);
    try {
      let uri: string;
      if (Platform.OS === 'web') {
        const htmlToImage = await import('html-to-image');
        const domNode = document.getElementById('story-card');
        if (!domNode) throw new Error('DOM node not found');
        await new Promise(resolve => setTimeout(resolve, 300));
        const dataUrl = await htmlToImage.toPng(domNode, { cacheBust: true, pixelRatio: 4 });
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], 'lettergram-story.png', { type: 'image/png' });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: 'LetterGram Story', text: 'Minha review no Letterboxd ✨' });
        } else {
          const link = document.createElement('a');
          link.download = 'lettergram-story.png';
          link.href = dataUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          Alert.alert('Imagem salva!', 'A imagem foi baixada. Abra o Instagram e compartilhe nos Stories manualmente.');
        }
      } else {
        if (!viewShotRef.current) return;
        uri = await (viewShotRef.current as any).capture();
        const instagramUrl = `instagram-stories://share`;
        const canOpen = await Linking.canOpenURL(instagramUrl);
        if (canOpen) {
          await Linking.openURL(instagramUrl);
        } else {
          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Compartilhar Story no Instagram' });
          } else {
            Alert.alert('Instagram', 'Não foi possível abrir o Instagram. Verifique se o app está instalado.');
          }
        }
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') Alert.alert('Erro', 'Não foi possível compartilhar.');
    } finally {
      setSharingStory(false);
    }
  };

  /** Volta para o estado inicial */
  const handleReset = () => {
    setData(null);
    setUrl('');
    setSelectedChunk(0);
    setDownloadSuccess(false);
    setPosterDownloadSuccess(false);
  };

  // ── Helpers de estilo do card ────────────────────────────────────────────
  const getSolidBg = () => {
    if (stickerMode === 4) return '#FFFFFF';
    if (stickerMode === 5) return '#1A1A1A';
    if (stickerMode === 6) return '#000000';
    return '#0a0a0a';
  };
  const getSolidTextColor = () => {
    if (stickerMode === 4) return '#111'; // branco bg → texto escuro
    return '#fff';
  };
  const getSolidAccent = () => {
    if (stickerMode === 4) return accent === '#FFFFFF' ? '#111' : accent;
    return accent;
  };

  // ════════════════════════════════════════════════════
  // ESTADO 1: Sem dados — tela de input centralizada
  // ════════════════════════════════════════════════════
  if (!data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.centeredContainer} keyboardShouldPersistTaps="handled" bounces={false}>
            <View style={styles.bgGlow} />
            <View style={styles.bgGlow2} />
            <View style={styles.centeredContent}>
              <View style={styles.logoArea}>
                <View style={styles.logoIcon}>
                  <View style={styles.logoLens} />
                </View>
                <Text style={styles.logoText}>Letter<Text style={styles.logoAccent}>gram</Text></Text>
                <Text style={styles.logoSub}>Reviews em arte</Text>
              </View>
              <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>LINK DA REVIEW</Text>
                <TextInput
                  ref={inputRef}
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
                  keyboardType="url"
                  textContentType="URL"
                  autoComplete="off"
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
              <Text style={styles.hint}>Cole o link de uma review do Letterboxd{'\n'}e transforme em um Story para Instagram</Text>
            </View>
            <TouchableOpacity style={styles.creditFooter} onPress={() => Linking.openURL('https://wilsonwagn.vercel.app/')} activeOpacity={0.6}>
              <Text style={styles.creditText}>feito por <Text style={styles.creditName}>Wilson Wagner</Text></Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Variáveis de estilo derivadas ────────────────────────────────────────
  const solidTextColor = getSolidTextColor();
  const solidAccent = getSolidAccent();
  const reviewFontFamily = isBold ? Typography.fontBold : Typography.fontRegular;

  // Sticker card style
  const getCardStyle = (): any => {
    const base = { width: PREVIEW_W };
    switch (stickerMode) {
      case 0: return { ...base, height: PREVIEW_MAX_H, backgroundColor: '#0a0a0a' };
      case 1: return { ...base, backgroundColor: 'transparent' };
      case 2: return { ...base, backgroundColor: 'rgba(10,10,10,0.6)', borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 16 };
      case 3: return { ...base, backgroundColor: 'rgba(10,10,10,0.8)', borderRadius: 32, borderWidth: 1, borderColor: accent, padding: 16 };
      case 4: return { ...base, backgroundColor: '#FFFFFF', borderRadius: 24 };
      case 5: return { ...base, backgroundColor: '#1A1A1A', borderRadius: 24 };
      case 6: return { ...base, backgroundColor: '#000000', borderRadius: 24 };
      default: return { ...base, height: PREVIEW_MAX_H };
    }
  };

  // ════════════════════════════════════════════════════
  // ESTADO 2: Com dados — preview + download
  // ════════════════════════════════════════════════════

  const storyCardContent = (
    <View nativeID="story-card" style={[styles.storyCard, getCardStyle()]}>
      {/* Background: poster blur — apenas modo Normal */}
      {stickerMode === 0 && data.posterBase64 ? (
        <Image source={{ uri: data.posterBase64 }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : null}

      {/* Overlay gradient — apenas modo Normal */}
      {stickerMode === 0 && (
        <LinearGradient colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.95)']} locations={[0, 0.35, 1]} style={StyleSheet.absoluteFill} />
      )}

      {/* Conteúdo */}
      <View style={[styles.storyContent, stickerMode === 0 && { flex: 1 }]}>
        {/* Poster + Title + Stars — compacto, próximo */}
        <View style={styles.storyMiddle}>
          {data.posterBase64 ? (
            <Image source={{ uri: data.posterBase64 }} style={styles.storyPoster} contentFit="cover" />
          ) : null}
          <View style={styles.storyMeta}>
            <Text style={[styles.storyTitle, isSolid && { color: solidTextColor }]} numberOfLines={3}>
              {stripYear(data.movieTitle)}
            </Text>
            <StarDisplay stars={data.stars} accent={solidAccent} />
          </View>
        </View>

        {/* Review text — logo abaixo das estrelas */}
        {displayText ? (
          <View style={[styles.reviewBubble, { borderLeftColor: solidAccent }]}>
            <Text
              style={[
                styles.reviewText,
                {
                  fontSize: 11 + fontSizeOffset,
                  lineHeight: 16 + fontSizeOffset,
                  textAlign: textAlign,
                  fontFamily: reviewFontFamily,
                },
                isSolid && { color: stickerMode === 4 ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.75)' },
              ]}
              numberOfLines={isSticker ? undefined : 15}
            >
              "{displayText}"
            </Text>
          </View>
        ) : null}

        {/* Spacer flexível para empurrar footer para baixo */}
        {stickerMode === 0 && <View style={{ flex: 1 }} />}

        {/* Footer: Review by + Logo */}
        <View style={styles.storyFooter}>
          {data.username ? (
            <View style={styles.reviewByContainer}>
              {data.avatarBase64 ? (
                <Image
                  source={{ uri: data.avatarBase64 }}
                  style={[styles.reviewByAvatar, { width: 18 + userSizeOffset, height: 18 + userSizeOffset, borderRadius: (18 + userSizeOffset) / 2 }]}
                  contentFit="cover"
                />
              ) : null}
              <Text style={[styles.reviewByText, { fontSize: 8 + userSizeOffset }, isSolid && { color: stickerMode === 4 ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.5)' }]}>
                review by <Text style={[styles.reviewByName, { color: solidAccent }]}>{data.username}</Text>
              </Text>
            </View>
          ) : null}

          {showLetterboxd && (
            <View style={styles.storyBottom}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', marginRight: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF8000' }} />
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#00E054', marginLeft: -3 }} />
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#40BCF4', marginLeft: -3 }} />
                </View>
                <Text style={{ color: isSolid ? solidTextColor : '#fff', fontSize: 10, fontFamily: Typography.fontBold, letterSpacing: -0.5 }}>Letterboxd</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );

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
          <Text style={styles.previewHeaderTitle}>Letter<Text style={styles.logoAccent}>gram</Text></Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Controles */}
        <View style={styles.controlsArea}>
          {/* Cores */}
          <View style={styles.accentRow}>
            {ACCENT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.color}
                style={[
                  styles.accentDot,
                  { backgroundColor: opt.color },
                  accent === opt.color && styles.accentDotActive,
                  opt.color === '#FFFFFF' && accent !== opt.color && { borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
                ]}
                onPress={() => setAccent(opt.color)}
                activeOpacity={0.7}
              />
            ))}
          </View>

          {/* Ferramentas — linha 1: Modo + Logo */}
          <View style={styles.toolsRow}>
            <TouchableOpacity
              style={[styles.toolBtn, stickerMode > 0 && { backgroundColor: accent, borderColor: accent }]}
              onPress={() => setStickerMode(prev => (prev + 1) % STICKER_MODES.length)}
            >
              <Text style={[styles.toolBtnText, stickerMode > 0 && { color: stickerMode === 4 || accent === '#FFFFFF' || accent === '#FFD700' || accent === '#CCFF00' || accent === '#69FFA0' || accent === '#00E5FF' ? '#000' : '#fff' }]}>
                {STICKER_MODES[stickerMode]}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toolBtn, !showLetterboxd && { opacity: 0.4 }]}
              onPress={() => setShowLetterboxd(!showLetterboxd)}
            >
              <Text style={styles.toolBtnText}>{showLetterboxd ? 'Logo: ON' : 'Logo: OFF'}</Text>
            </TouchableOpacity>
          </View>

          {/* Ferramentas — linha 2: Fonte, Alinhamento, Negrito */}
          <View style={styles.toolsRow}>
            <View style={styles.fontControls}>
              <TouchableOpacity style={styles.toolBtnIcon} onPress={() => setFontSizeOffset(prev => Math.max(prev - 2, -8))}>
                <Text style={styles.toolBtnText}>A−</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolBtnIcon} onPress={() => setFontSizeOffset(prev => Math.min(prev + 2, 8))}>
                <Text style={styles.toolBtnText}>A+</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.toolBtn}
              onPress={() => {
                const idx = ALIGN_OPTIONS.indexOf(textAlign);
                setTextAlign(ALIGN_OPTIONS[(idx + 1) % ALIGN_OPTIONS.length]);
              }}
            >
              <Text style={styles.toolBtnText}>{ALIGN_LABELS[textAlign]}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toolBtn, isBold && { backgroundColor: 'rgba(255,255,255,0.15)' }]}
              onPress={() => setIsBold(!isBold)}
            >
              <Text style={[styles.toolBtnText, isBold && { fontFamily: Typography.fontBold }]}>
                {isBold ? 'Bold' : 'Regular'}
              </Text>
            </TouchableOpacity>

            <View style={styles.fontControls}>
              <TouchableOpacity style={styles.toolBtnIcon} onPress={() => setUserSizeOffset(prev => Math.max(prev - 2, -4))}>
                <Text style={styles.toolBtnText}>👤−</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolBtnIcon} onPress={() => setUserSizeOffset(prev => Math.min(prev + 2, 8))}>
                <Text style={styles.toolBtnText}>👤+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Overflow warning */}
        {overflowWarning && (
          <View style={styles.warningBar}>
            <Text style={styles.warningText}>O texto pode ultrapassar a margem do card com essa fonte.</Text>
          </View>
        )}

        {/* Preview do Story */}
        <Animated.View style={[styles.previewArea, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <ViewShot
            ref={viewShotRef}
            options={{ format: 'png', quality: 1.0, pixelRatio: 4 }}
            style={[styles.viewShotWrap, isSticker && !isSolid && { backgroundColor: 'transparent', elevation: 0, shadowOpacity: 0 }]}
          >
            {storyCardContent}
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
                  <TouchableOpacity key={i} onPress={() => setSelectedChunk(i)} style={[styles.chunkDot, i === selectedChunk && { backgroundColor: accent }]} />
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

        {/* Botões de ação — sempre acessíveis, nunca cobertos */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.downloadBtn, { shadowColor: accent, backgroundColor: accent }, downloadSuccess && styles.downloadBtnSuccess, saving && styles.downloadBtnSaving]}
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

          <View style={styles.secondaryBtns}>
            <TouchableOpacity
              style={[styles.secondaryBtn, posterDownloadSuccess && { backgroundColor: '#00E096', borderColor: '#00E096' }]}
              onPress={handleDownloadPoster}
              disabled={savingPoster}
              activeOpacity={0.85}
            >
              {savingPoster ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : posterDownloadSuccess ? (
                <Text style={styles.secondaryBtnText}>✓ Capa salva</Text>
              ) : (
                <Text style={styles.secondaryBtnText}>Baixar Capa</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryBtn, styles.instagramBtn]}
              onPress={handleShareInstagram}
              disabled={sharingStory}
              activeOpacity={0.85}
            >
              {sharingStory ? (
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
          <Text style={styles.creditTextSmall}>feito por <Text style={styles.creditName}>Wilson Wagner</Text></Text>
        </TouchableOpacity>
      </ScrollView>
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
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 24,
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
  logoArea: { alignItems: 'center', marginBottom: 40 },
  logoIcon: {
    width: 48, height: 38, borderWidth: 1.5,
    borderColor: 'rgba(204,255,0,0.4)', borderRadius: 6,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  logoLens: {
    width: 16, height: 16, borderRadius: 8, borderWidth: 1.5,
    borderColor: 'rgba(204,255,0,0.5)', backgroundColor: 'rgba(204,255,0,0.08)',
  },
  logoText: { fontSize: 32, fontFamily: Typography.fontBlack, color: '#fff', letterSpacing: -1 },
  logoAccent: { color: Colors.accent },
  logoSub: { fontSize: 11, fontFamily: Typography.fontMedium, color: 'rgba(255,255,255,0.25)', letterSpacing: 4, textTransform: 'uppercase', marginTop: 6 },

  // Input card
  inputCard: { width: '100%', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: 20, gap: 14 },
  inputLabel: { fontSize: 10, fontFamily: Typography.fontSemiBold, color: 'rgba(255,255,255,0.3)', letterSpacing: 2 },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 12, paddingHorizontal: 16, height: 48, fontSize: 14, fontFamily: Typography.fontRegular, color: '#fff' },
  generateBtn: {
    backgroundColor: Colors.accent, borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
  },
  generateBtnLoading: { opacity: 0.8 },
  generateBtnText: { fontSize: 15, fontFamily: Typography.fontBold, color: '#000', letterSpacing: 0.3 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hint: { marginTop: 24, fontSize: 12, fontFamily: Typography.fontRegular, color: 'rgba(255,255,255,0.15)', textAlign: 'center', lineHeight: 18 },

  // Credit
  creditFooter: { marginTop: 40, paddingVertical: 12, alignItems: 'center' },
  creditFooterPreview: { paddingVertical: 8, alignItems: 'center' },
  creditText: { fontSize: 11, fontFamily: Typography.fontRegular, color: 'rgba(255,255,255,0.2)' },
  creditTextSmall: { fontSize: 9, fontFamily: Typography.fontRegular, color: 'rgba(255,255,255,0.15)' },
  creditName: { fontFamily: Typography.fontSemiBold, color: 'rgba(255,255,255,0.35)', textDecorationLine: 'underline' },

  // ══════════════════════════════════════════
  // ESTADO 2: Preview (com dados)
  // ══════════════════════════════════════════

  // Header
  previewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, paddingBottom: 8 },
  backBtn: { paddingVertical: 6, paddingRight: 12 },
  backBtnText: { fontSize: 13, fontFamily: Typography.fontSemiBold, color: 'rgba(255,255,255,0.5)' },
  previewHeaderTitle: { fontSize: 16, fontFamily: Typography.fontBold, color: '#fff', letterSpacing: -0.3 },

  // Controles
  controlsArea: { paddingVertical: 6, gap: 10 },
  accentRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, flexWrap: 'wrap' },
  accentDot: { width: 20, height: 20, borderRadius: 10, opacity: 0.6 },
  accentDotActive: {
    opacity: 1, borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#fff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  toolsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 8 },
  toolBtn: { backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  toolBtnIcon: { backgroundColor: 'rgba(255,255,255,0.06)', width: 30, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  fontControls: { flexDirection: 'row', gap: 4 },
  toolBtnText: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontFamily: Typography.fontSemiBold },

  // Warning bar
  warningBar: { backgroundColor: 'rgba(255,170,0,0.1)', borderWidth: 1, borderColor: 'rgba(255,170,0,0.2)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginTop: 4 },
  warningText: { color: 'rgba(255,170,0,0.8)', fontSize: 10, fontFamily: Typography.fontRegular, textAlign: 'center' },

  // Preview
  previewArea: { alignItems: 'center', paddingVertical: 12 },
  viewShotWrap: { overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10 },
  storyCard: { overflow: 'hidden', backgroundColor: '#0a0a0a' },
  storyContent: { padding: 18, justifyContent: 'flex-start', gap: 10 },
  storyTop: { alignItems: 'flex-end' },
  storyMiddle: { flexDirection: 'column', gap: 6, alignItems: 'center' },
  storyPoster: { width: 60, height: 90 },
  storyMeta: { gap: 4, alignItems: 'center' },
  storyTitle: { fontSize: 17, fontFamily: Typography.fontBlack, color: '#fff', lineHeight: 21, textAlign: 'center' },
  reviewBubble: { borderLeftWidth: 2, paddingLeft: 10, marginTop: 2 },
  reviewText: { fontSize: 11, fontFamily: Typography.fontRegular, color: 'rgba(255,255,255,0.75)', fontStyle: 'italic', lineHeight: 16 },

  // Footer do Story
  storyFooter: { alignItems: 'center', gap: 6, paddingTop: 12 },
  reviewByContainer: { alignItems: 'center', gap: 3 },
  reviewByAvatar: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  reviewByText: { color: 'rgba(255,255,255,0.5)', fontFamily: Typography.fontRegular, fontSize: 8 },
  reviewByName: { fontFamily: Typography.fontSemiBold },
  storyBottom: { alignItems: 'center' },

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
});
