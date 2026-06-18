/**
 * StarDisplay — Estrelas visuais com efeito neon.
 * Componente extraído do index.tsx para reuso.
 */
import { View, Text, Platform } from 'react-native';
import { StoryCardSizes } from '../constants/storyConfig';

interface StarDisplayProps {
  stars: number;
  accent: string;
}

export function StarDisplay({ stars, accent }: StarDisplayProps) {
  const full = Math.floor(stars);
  const half = stars % 1 !== 0;
  const neonStyle = Platform.OS === 'web'
    ? { textShadow: `0 0 4px ${accent}, 0 0 8px ${accent}, 0 0 16px ${accent}40` } as any
    : { textShadowColor: accent, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 };

  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => {
        const isFilled = i < full || (i === full && half);
        return (
          <Text
            key={i}
            style={[
              { fontSize: StoryCardSizes.starFontSize, color: isFilled ? accent : 'rgba(255,255,255,0.15)' },
              isFilled ? neonStyle : {},
            ]}
          >
            {i < full ? '★' : (i === full && half ? '★' : '☆')}
          </Text>
        );
      })}
    </View>
  );
}
