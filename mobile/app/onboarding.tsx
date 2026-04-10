import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  Dimensions, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';
import { saveUsername } from '../services/storage';

const { height } = Dimensions.get('window');

const LOGO_SVG_SIZE = 56;

export default function OnboardingScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    const trimmed = username.trim().replace(/^@/, '').toLowerCase();
    if (!trimmed) {
      Alert.alert('Atenção', 'Digite seu username do Letterboxd para continuar.');
      return;
    }

    setLoading(true);
    try {
      await saveUsername(trimmed);
      router.replace('/(tabs)');
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={['#0A0A0A', '#0F1A00', '#0A0A0A']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Glow orb */}
      <View style={styles.glowOrb} />

      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Logo area */}
        <View style={styles.logoArea}>
          {/* Film icon SVG-like using shapes */}
          <View style={styles.logoIconWrap}>
            <View style={styles.filmFrame}>
              <View style={styles.filmLens} />
              {/* Sprocket holes left */}
              <View style={[styles.sprocket, { left: -8, top: 8 }]} />
              <View style={[styles.sprocket, { left: -8, top: 22 }]} />
              <View style={[styles.sprocket, { left: -8, top: 36 }]} />
              {/* Sprocket holes right */}
              <View style={[styles.sprocket, { right: -8, top: 8 }]} />
              <View style={[styles.sprocket, { right: -8, top: 22 }]} />
              <View style={[styles.sprocket, { right: -8, top: 36 }]} />
            </View>
          </View>

          <Text style={styles.wordmark}>
            Letter<Text style={styles.wordmarkAccent}>gram</Text>
          </Text>
          <Text style={styles.tagSub}>Cinema · Social</Text>
        </View>

        {/* Heading */}
        <View style={styles.headingArea}>
          <Text style={styles.heading}>Bem-vindo 👋</Text>
          <Text style={styles.subHeading}>
            Digite seu username do Letterboxd para sincronizar seu perfil, diário e criar seu Recap.
          </Text>
        </View>

        {/* Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Username Letterboxd</Text>
          <View style={styles.inputWrap}>
            <Text style={styles.atSign}>@</Text>
            <TextInput
              style={styles.input}
              placeholder="seuusername"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              value={username}
              onChangeText={setUsername}
              onSubmitEditing={handleContinue}
              returnKeyType="go"
            />
          </View>
          <Text style={styles.inputHint}>
            Ex: letterboxd.com/<Text style={{ color: Colors.accent }}>seuusername</Text>
          </Text>
        </View>

        {/* CTA Button */}
        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleContinue}
          activeOpacity={0.85}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.btnText}>Sincronizar perfil →</Text>
          )}
        </TouchableOpacity>

        {/* Footer note */}
        <Text style={styles.footerNote}>
          Seus dados ficam salvos apenas neste dispositivo.{'\n'}Sem conta. Sem senha.
        </Text>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  glowOrb: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(204,255,0,0.06)',
    top: height * 0.08,
    alignSelf: 'center',
  },
  inner: {
    flex: 1,
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 80,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
  },
  logoIconWrap: {
    marginBottom: Spacing.lg,
  },
  filmFrame: {
    width: 56,
    height: 44,
    borderWidth: 2,
    borderColor: Colors.accent,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filmLens: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.accent,
    backgroundColor: 'rgba(204,255,0,0.15)',
  },
  sprocket: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 1,
    backgroundColor: Colors.accent,
  },
  wordmark: {
    fontSize: Typography['2xl'],
    fontFamily: Typography.fontBlack,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  wordmarkAccent: {
    color: Colors.accent,
  },
  tagSub: {
    fontSize: Typography.xs,
    fontFamily: Typography.fontSemiBold,
    color: Colors.textMuted,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: 6,
  },
  headingArea: {
    marginBottom: Spacing['3xl'],
  },
  heading: {
    fontSize: Typography['2xl'],
    fontFamily: Typography.fontBold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subHeading: {
    fontSize: Typography.base,
    fontFamily: Typography.fontRegular,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: Spacing.xl,
  },
  inputLabel: {
    fontSize: Typography.sm,
    fontFamily: Typography.fontSemiBold,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    height: 54,
  },
  atSign: {
    fontSize: Typography.md,
    fontFamily: Typography.fontMedium,
    color: Colors.accent,
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: Typography.md,
    fontFamily: Typography.fontMedium,
    color: Colors.text,
  },
  inputHint: {
    fontSize: Typography.sm,
    fontFamily: Typography.fontRegular,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  btn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.lg,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: Spacing.xl,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    fontSize: Typography.md,
    fontFamily: Typography.fontExtraBold,
    color: '#000',
    letterSpacing: 0.2,
  },
  footerNote: {
    fontSize: Typography.sm,
    fontFamily: Typography.fontRegular,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
