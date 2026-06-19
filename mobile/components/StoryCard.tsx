/**
 * StoryCard — Card de preview do Story (o conteúdo que é exportado como imagem).
 * Renderiza poster, título, estrelas, texto da review, avatar e logo Letterboxd.
 */
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography } from '../constants/theme';
import {
  PREVIEW_W, PREVIEW_MAX_H, StoryCardSizes,
} from '../constants/storyConfig';
import { StarDisplay } from './StarDisplay';
import type { ReviewData } from '../services/letterboxd';

interface StoryCardProps {
  data: ReviewData;
  displayText: string;
  accent: string;
  stickerMode: number;
  showLetterboxd: boolean;
  fontSizeOffset: number;
  titleSizeOffset: number;
  userSizeOffset: number;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  isBold: boolean;
  isSticker: boolean;
  /** Nível de escurecimento da capa de fundo (0–100). Apenas modo Normal. */
  darknessLevel: number;
}

/** Remove o ano (YYYY) do título do filme */
function stripYear(title: string): string {
  return title.replace(/\s*\(\d{4}\)\s*$/, '').trim();
}

/** Helpers de estilo derivados do modo solid */
function getSolidTextColor(stickerMode: number): string {
  return stickerMode === 4 ? '#111' : '#fff';
}

function getSolidAccent(stickerMode: number, accent: string): string {
  if (stickerMode === 4) return accent === '#FFFFFF' ? '#111' : accent;
  return accent;
}

function getCardStyle(stickerMode: number, accent: string): any {
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
}

export function StoryCard({
  data, displayText, accent, stickerMode,
  showLetterboxd, fontSizeOffset, titleSizeOffset,
  userSizeOffset, textAlign, isBold, isSticker,
  darknessLevel,
}: StoryCardProps) {
  const isSolid = stickerMode >= 4;
  const solidTextColor = getSolidTextColor(stickerMode);
  const solidAccent = getSolidAccent(stickerMode, accent);
  const hasReviewText = !!displayText;
  const reviewFontFamily = isBold ? Typography.fontBold : Typography.fontRegular;

  return (
    <View nativeID="story-card" style={[styles.storyCard, getCardStyle(stickerMode, accent)]}>
      {/* Background: poster blur — apenas modo Normal */}
      {stickerMode === 0 && data.posterBase64 ? (
        <Image source={{ uri: data.posterBase64 }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : null}

      {/* Overlay gradient — apenas modo Normal, controlado pelo darknessLevel */}
      {stickerMode === 0 && (() => {
        const d = darknessLevel / 100; // 0..1
        const colors: [string, string, string] = hasReviewText
          ? [
              `rgba(0,0,0,${(0.05 + d * 0.95).toFixed(2)})`,
              `rgba(0,0,0,${(0.15 + d * 0.85).toFixed(2)})`,
              `rgba(0,0,0,${(0.50 + d * 0.50).toFixed(2)})`,
            ]
          : [
              `rgba(0,0,0,${(0.05 + d * 0.95).toFixed(2)})`,
              `rgba(0,0,0,${(0.10 + d * 0.90).toFixed(2)})`,
              `rgba(0,0,0,${(0.05 + d * 0.95).toFixed(2)})`,
            ];
        return (
          <LinearGradient
            colors={colors}
            locations={hasReviewText ? [0, 0.35, 1] : [0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />
        );
      })()}

      {/* Conteúdo */}
      <View style={[
        styles.storyContent,
        stickerMode === 0 && { flex: 1 },
      ]}>
        {/* Spacer superior — empurra conteúdo para o centro */}
        {stickerMode === 0 && <View style={{ flex: 1 }} />}

        {/* Poster + Title + Stars */}
        <View style={[styles.storyMiddle, !hasReviewText && { gap: 12 }]}>
          {data.posterBase64 ? (
            <Image
              source={{ uri: data.posterBase64 }}
              style={[
                styles.storyPoster,
                !hasReviewText && {
                  width: StoryCardSizes.posterWidthLarge,
                  height: StoryCardSizes.posterHeightLarge,
                },
              ]}
              contentFit="cover"
            />
          ) : null}
          <View style={styles.storyMeta}>
            <Text
              style={[
                styles.storyTitle,
                {
                  fontSize: (hasReviewText ? StoryCardSizes.titleFontSize : StoryCardSizes.titleFontSizeLarge) + titleSizeOffset,
                  lineHeight: (hasReviewText ? StoryCardSizes.titleLineHeight : StoryCardSizes.titleLineHeightLarge) + titleSizeOffset,
                },
                isSolid && { color: solidTextColor },
              ]}
              numberOfLines={3}
            >
              {stripYear(data.movieTitle)}
            </Text>
            <StarDisplay stars={data.stars} accent={solidAccent} />
          </View>
        </View>

        {/* Review text */}
        {displayText ? (
          <View style={[styles.reviewBubble, { borderLeftColor: solidAccent }]}>
            <Text
              style={[
                styles.reviewText,
                {
                  fontSize: StoryCardSizes.reviewFontSize + fontSizeOffset,
                  lineHeight: StoryCardSizes.reviewLineHeight + fontSizeOffset,
                  textAlign,
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

        {/* Spacer inferior — empurra conteúdo para o centro e footer para baixo */}
        {stickerMode === 0 && <View style={{ flex: 1 }} />}

        {/* Footer: Review by + Logo */}
        <View style={styles.storyFooter}>
          {data.username ? (
            <View style={styles.reviewByContainer}>
              {data.avatarBase64 ? (
                <Image
                  source={{ uri: data.avatarBase64 }}
                  style={[styles.reviewByAvatar, {
                    width: StoryCardSizes.avatarSize + userSizeOffset,
                    height: StoryCardSizes.avatarSize + userSizeOffset,
                    borderRadius: (StoryCardSizes.avatarSize + userSizeOffset) / 2,
                  }]}
                  contentFit="cover"
                />
              ) : null}
              <Text style={[
                styles.reviewByText,
                { fontSize: StoryCardSizes.reviewByFontSize + userSizeOffset },
                isSolid && { color: stickerMode === 4 ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.5)' },
              ]}>
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
                <Text style={{
                  color: isSolid ? solidTextColor : '#fff',
                  fontSize: StoryCardSizes.letterboxdFontSize,
                  fontFamily: Typography.fontBold,
                  letterSpacing: -0.5,
                }}>
                  Letterboxd
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  storyCard: { overflow: 'hidden', backgroundColor: '#0a0a0a' },
  storyContent: { padding: 18, justifyContent: 'flex-start', gap: 10 },
  storyMiddle: { flexDirection: 'column', gap: 6, alignItems: 'center' },
  storyPoster: { width: StoryCardSizes.posterWidth, height: StoryCardSizes.posterHeight },
  storyMeta: { gap: 4, alignItems: 'center' },
  storyTitle: {
    fontSize: StoryCardSizes.titleFontSize,
    fontFamily: Typography.fontBlack,
    color: '#fff',
    lineHeight: StoryCardSizes.titleLineHeight,
    textAlign: 'center',
  },
  reviewBubble: { borderLeftWidth: 2, paddingLeft: 10, marginTop: 2 },
  reviewText: {
    fontSize: StoryCardSizes.reviewFontSize,
    fontFamily: Typography.fontRegular,
    color: 'rgba(255,255,255,0.75)',
    fontStyle: 'italic',
    lineHeight: StoryCardSizes.reviewLineHeight,
  },
  storyFooter: { alignItems: 'center', gap: 6, paddingTop: 12 },
  reviewByContainer: { alignItems: 'center', gap: 3 },
  reviewByAvatar: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  reviewByText: { color: 'rgba(255,255,255,0.5)', fontFamily: Typography.fontRegular, fontSize: StoryCardSizes.reviewByFontSize },
  reviewByName: { fontFamily: Typography.fontSemiBold },
  storyBottom: { alignItems: 'center' },
});
