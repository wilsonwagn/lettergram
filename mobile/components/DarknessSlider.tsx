/**
 * DarknessSlider — Controle minimalista de escurecimento da capa.
 * Um slider fino e elegante, com ícone de lua e track com glow sutil.
 * Aparece apenas no modo Normal.
 */
import { useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, PanResponder,
  Animated, LayoutChangeEvent, Platform,
} from 'react-native';
import { Typography } from '../constants/theme';

const TRACK_WIDTH = 160;
const TRACK_HEIGHT = 3;
const THUMB_SIZE = 16;

interface DarknessSliderProps {
  /** Valor de 0 (sem escurecimento) a 100 (totalmente preto) */
  value: number;
  onChange: (value: number) => void;
  accent: string;
}

export function DarknessSlider({ value, onChange, accent }: DarknessSliderProps) {
  const trackWidth = useRef(TRACK_WIDTH);
  const currentValue = useRef(value);
  currentValue.current = value;

  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const x = evt.nativeEvent.locationX;
        const newVal = clamp((x / trackWidth.current) * 100);
        onChange(newVal);
      },
      onPanResponderMove: (evt, gestureState) => {
        const startX = (currentValue.current / 100) * trackWidth.current;
        const newX = startX + gestureState.dx;
        const newVal = clamp((newX / trackWidth.current) * 100);
        onChange(newVal);
      },
    })
  ).current;

  const onTrackLayout = useCallback((e: LayoutChangeEvent) => {
    trackWidth.current = e.nativeEvent.layout.width;
  }, []);

  const thumbLeft = (value / 100) * TRACK_WIDTH;
  const fillPercent = `${value}%`;

  // Cor do thumb: accent com glow
  const thumbGlowStyle = Platform.OS === 'web'
    ? { boxShadow: `0 0 6px ${accent}80, 0 0 12px ${accent}30` } as any
    : { shadowColor: accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 6, elevation: 4 };

  return (
    <View style={styles.container}>
      {/* Ícone lua (escurecimento) */}
      <Text style={styles.icon}>🌙</Text>

      {/* Track */}
      <View
        style={styles.trackContainer}
        onLayout={onTrackLayout}
        {...panResponder.panHandlers}
      >
        {/* Track background */}
        <View style={styles.track} />

        {/* Track fill */}
        <View style={[styles.trackFill, { width: fillPercent as any, backgroundColor: accent }]} />

        {/* Thumb */}
        <View
          style={[
            styles.thumb,
            { left: thumbLeft - THUMB_SIZE / 2, backgroundColor: accent },
            thumbGlowStyle,
          ]}
        />
      </View>

      {/* Percentual */}
      <Text style={styles.label}>{value}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  icon: {
    fontSize: 12,
    opacity: 0.5,
  },
  trackContainer: {
    width: TRACK_WIDTH,
    height: THUMB_SIZE + 8,
    justifyContent: 'center',
    position: 'relative',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
  },
  track: {
    width: '100%',
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  trackFill: {
    position: 'absolute',
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    top: (THUMB_SIZE + 8 - TRACK_HEIGHT) / 2,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    top: 4,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.3)',
  },
  label: {
    fontSize: 9,
    fontFamily: Typography.fontSemiBold,
    color: 'rgba(255,255,255,0.35)',
    width: 28,
    textAlign: 'right',
  },
});
