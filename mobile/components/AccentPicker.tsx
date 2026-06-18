/**
 * AccentPicker — Seletor de cores de destaque.
 * Renderiza os dots coloridos para trocar o accent do Story.
 */
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { ACCENT_OPTIONS } from '../constants/storyConfig';

interface AccentPickerProps {
  accent: string;
  onSelect: (color: string) => void;
}

export function AccentPicker({ accent, onSelect }: AccentPickerProps) {
  return (
    <View style={styles.accentRow}>
      {ACCENT_OPTIONS.map(opt => (
        <TouchableOpacity
          key={opt.color}
          style={[
            styles.accentDot,
            { backgroundColor: opt.color },
            accent === opt.color && styles.accentDotActive,
            opt.color === '#FFFFFF' && accent !== opt.color && styles.whiteBorder,
          ]}
          onPress={() => onSelect(opt.color)}
          activeOpacity={0.7}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  accentRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  accentDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    opacity: 0.6,
  },
  accentDotActive: {
    opacity: 1,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  whiteBorder: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
});
