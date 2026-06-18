/**
 * ToolsBar — Barra de ferramentas do editor de Story.
 * Controles de modo, logo, fonte, título, alinhamento, negrito e tamanho do usuário.
 */
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Typography } from '../constants/theme';
import {
  STICKER_MODES, ALIGN_OPTIONS, ALIGN_LABELS,
  LIGHT_ACCENTS, type TextAlignOption,
} from '../constants/storyConfig';

interface ToolsBarProps {
  // Estado
  stickerMode: number;
  showLetterboxd: boolean;
  fontSizeOffset: number;
  titleSizeOffset: number;
  userSizeOffset: number;
  textAlign: TextAlignOption;
  isBold: boolean;
  accent: string;
  // Callbacks
  onStickerModeChange: (mode: number) => void;
  onToggleLetterboxd: () => void;
  onFontSizeChange: (offset: number) => void;
  onTitleSizeChange: (offset: number) => void;
  onUserSizeChange: (offset: number) => void;
  onTextAlignChange: (align: TextAlignOption) => void;
  onToggleBold: () => void;
}

export function ToolsBar({
  stickerMode, showLetterboxd, textAlign, isBold, accent,
  fontSizeOffset, titleSizeOffset, userSizeOffset,
  onStickerModeChange, onToggleLetterboxd,
  onFontSizeChange, onTitleSizeChange, onUserSizeChange,
  onTextAlignChange, onToggleBold,
}: ToolsBarProps) {
  const isLightAccent = LIGHT_ACCENTS.has(accent) || stickerMode === 4;

  return (
    <View style={styles.controlsArea}>
      {/* Ferramentas — linha 1: Modo + Logo */}
      <View style={styles.toolsRow}>
        <TouchableOpacity
          style={[styles.toolBtn, stickerMode > 0 && { backgroundColor: accent, borderColor: accent }]}
          onPress={() => onStickerModeChange((stickerMode + 1) % STICKER_MODES.length)}
        >
          <Text style={[styles.toolBtnText, stickerMode > 0 && { color: isLightAccent ? '#000' : '#fff' }]}>
            {STICKER_MODES[stickerMode]}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toolBtn, !showLetterboxd && { opacity: 0.4 }]}
          onPress={onToggleLetterboxd}
        >
          <Text style={styles.toolBtnText}>{showLetterboxd ? 'Logo: ON' : 'Logo: OFF'}</Text>
        </TouchableOpacity>
      </View>

      {/* Ferramentas — linha 2: Fonte, Título, Alinhamento, Negrito, Usuário */}
      <View style={styles.toolsRow}>
        {/* Fonte A−/A+ */}
        <View style={styles.fontControls}>
          <TouchableOpacity style={styles.toolBtnIcon} onPress={() => onFontSizeChange(Math.max(fontSizeOffset - 2, -8))}>
            <Text style={styles.toolBtnText}>A−</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtnIcon} onPress={() => onFontSizeChange(Math.min(fontSizeOffset + 2, 8))}>
            <Text style={styles.toolBtnText}>A+</Text>
          </TouchableOpacity>
        </View>

        {/* Título T−/T+ */}
        <View style={styles.fontControls}>
          <TouchableOpacity style={styles.toolBtnIcon} onPress={() => onTitleSizeChange(Math.max(titleSizeOffset - 4, -8))}>
            <Text style={styles.toolBtnText}>T−</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtnIcon} onPress={() => onTitleSizeChange(Math.min(titleSizeOffset + 4, 16))}>
            <Text style={styles.toolBtnText}>T+</Text>
          </TouchableOpacity>
        </View>

        {/* Alinhamento */}
        <TouchableOpacity
          style={styles.toolBtn}
          onPress={() => {
            const idx = ALIGN_OPTIONS.indexOf(textAlign);
            onTextAlignChange(ALIGN_OPTIONS[(idx + 1) % ALIGN_OPTIONS.length]);
          }}
        >
          <Text style={styles.toolBtnText}>{ALIGN_LABELS[textAlign]}</Text>
        </TouchableOpacity>

        {/* Negrito */}
        <TouchableOpacity
          style={[styles.toolBtn, isBold && { backgroundColor: 'rgba(255,255,255,0.15)' }]}
          onPress={onToggleBold}
        >
          <Text style={[styles.toolBtnText, isBold && { fontFamily: Typography.fontBold }]}>
            {isBold ? 'Bold' : 'Regular'}
          </Text>
        </TouchableOpacity>

        {/* Tamanho do usuário 👤−/👤+ */}
        <View style={styles.fontControls}>
          <TouchableOpacity style={styles.toolBtnIcon} onPress={() => onUserSizeChange(Math.max(userSizeOffset - 2, -4))}>
            <Text style={styles.toolBtnText}>👤−</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtnIcon} onPress={() => onUserSizeChange(Math.min(userSizeOffset + 2, 8))}>
            <Text style={styles.toolBtnText}>👤+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  controlsArea: { paddingVertical: 6, gap: 10 },
  toolsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 8 },
  toolBtn: { backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  toolBtnIcon: { backgroundColor: 'rgba(255,255,255,0.06)', width: 30, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  fontControls: { flexDirection: 'row', gap: 4 },
  toolBtnText: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontFamily: Typography.fontSemiBold },
});
