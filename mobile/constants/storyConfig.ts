/**
 * Configurações e constantes do Story card.
 * Centraliza valores que antes estavam inline no index.tsx.
 */
import { Dimensions } from 'react-native';

// ── Dimensões responsivas ──────────────────────────────────────────────────
const { height: SCREEN_H } = Dimensions.get('window');

/** Preview: ocupa no máximo 52% da altura da tela, proporção 9:16 */
export const PREVIEW_MAX_H = Math.min(SCREEN_H * 0.52, 480);
export const PREVIEW_W = PREVIEW_MAX_H * (9 / 16);
export const SCREEN_HEIGHT = SCREEN_H;

// ── Tamanhos de elementos do Story ─────────────────────────────────────────
export const StoryCardSizes = {
  /** Tamanho das estrelas */
  starFontSize: 13,
  /** Tamanho base do texto da review */
  reviewFontSize: 11,
  /** Line height base do texto da review */
  reviewLineHeight: 16,
  /** Poster (com review text) */
  posterWidth: 60,
  posterHeight: 90,
  /** Poster (sem review text — centralizado, mais destaque) */
  posterWidthLarge: 100,
  posterHeightLarge: 150,
  /** Título base */
  titleFontSize: 17,
  titleLineHeight: 21,
  /** Título quando não tem review (maior destaque) */
  titleFontSizeLarge: 20,
  titleLineHeightLarge: 25,
  /** Avatar do autor */
  avatarSize: 18,
  /** Fonte do rodapé "review by" */
  reviewByFontSize: 8,
  /** Fonte do logo Letterboxd */
  letterboxdFontSize: 10,
} as const;

// ── Paleta de cores de destaque ────────────────────────────────────────────
export const ACCENT_OPTIONS = [
  { color: '#CCFF00', label: 'Lima' },
  { color: '#FF6B35', label: 'Tangerina' },
  { color: '#00E5FF', label: 'Cyan' },
  { color: '#FF4D9D', label: 'Rosa' },
  { color: '#B388FF', label: 'Lavanda' },
  { color: '#69FFA0', label: 'Menta' },
  { color: '#FFFFFF', label: 'Branco' },
  { color: '#FFD700', label: 'Amarelo' },
] as const;

/** Cores claras que precisam de texto escuro por cima */
export const LIGHT_ACCENTS = new Set(['#FFFFFF', '#FFD700', '#CCFF00', '#69FFA0', '#00E5FF']);

// ── Modos de visualização ──────────────────────────────────────────────────
export const STICKER_MODES = [
  'Normal',
  'Sticker: Clean',
  'Sticker: Glass',
  'Sticker: Box',
  'Solid: Branco',
  'Solid: Cinza',
  'Solid: Preto',
] as const;

// ── Alinhamento de texto ───────────────────────────────────────────────────
export type TextAlignOption = 'left' | 'center' | 'right' | 'justify';
export const ALIGN_OPTIONS: TextAlignOption[] = ['justify', 'left', 'center', 'right'];
export const ALIGN_LABELS: Record<TextAlignOption, string> = {
  justify: 'Justificado',
  left: 'Esquerda',
  center: 'Centro',
  right: 'Direita',
};

// ── Review text chunking ───────────────────────────────────────────────────
/** Tamanho máximo de cada trecho da review antes de quebrar */
export const REVIEW_CHUNK_SIZE = 700;
