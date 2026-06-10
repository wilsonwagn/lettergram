// ──────────────────────────────────────────────
//  LetterGram Design System
//  Tokens centralizados: cores, tipografia, espaçamentos, sombras.
//  Todos os componentes importam daqui para manter consistência.
// ──────────────────────────────────────────────

export const Colors = {
  // Brand (verde-limão neon)
  accent: '#CCFF00',
  accentDim: 'rgba(204,255,0,0.15)',
  accentGlow: 'rgba(204,255,0,0.35)',

  // Backgrounds (dark mode)
  bg: '#0A0A0A',
  surface1: '#111111',
  surface2: '#1A1A1A',
  surface3: '#242424',
  border: 'rgba(255,255,255,0.08)',
  borderLight: 'rgba(255,255,255,0.12)',

  // Text
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.55)',
  textMuted: 'rgba(255,255,255,0.28)',

  // States
  error: '#FF4D4D',
  success: '#00E096',
  warning: '#FFAA00',
} as const;

export const Typography = {
  // Font families (carregadas via expo-font no _layout.tsx)
  fontRegular: 'Inter_400Regular',
  fontMedium: 'Inter_500Medium',
  fontSemiBold: 'Inter_600SemiBold',
  fontBold: 'Inter_700Bold',
  fontExtraBold: 'Inter_800ExtraBold',
  fontBlack: 'Inter_900Black',

  // Tamanhos de fonte
  xs: 10,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 22,
  '2xl': 28,
  '3xl': 36,
  '4xl': 48,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 48,
  screenPadding: 20,  // padding horizontal padrão das telas
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,  // pílula / circular
} as const;

export const Shadows = {
  // Sombra neon para elementos de destaque
  accent: {
    shadowColor: '#CCFF00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  // Sombra neutra para cards
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 5,
  },
} as const;
