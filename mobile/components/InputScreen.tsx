/**
 * InputScreen — Tela inicial do LetterGram (Estado 1: sem dados).
 * Logo centralizado, campo de URL e botão de gerar.
 */
import { useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet, Platform,
  KeyboardAvoidingView, ScrollView, Linking,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography } from '../constants/theme';

const SCREEN_H = Dimensions.get('window').height;

interface InputScreenProps {
  url: string;
  loading: boolean;
  onUrlChange: (url: string) => void;
  onSubmit: () => void;
}

export function InputScreen({ url, loading, onUrlChange, onSubmit }: InputScreenProps) {
  const inputRef = useRef<TextInput>(null);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.centeredContainer} keyboardShouldPersistTaps="handled" bounces={false}>
          <View style={styles.bgGlow} />
          <View style={styles.bgGlow2} />
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

            {/* Input card */}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>LINK DA REVIEW</Text>
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder="letterboxd.com/user/film/..."
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={url}
                onChangeText={onUrlChange}
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={onSubmit}
                returnKeyType="go"
                selectTextOnFocus
                keyboardType="url"
                textContentType="URL"
                autoComplete="off"
              />
              <TouchableOpacity
                style={[styles.generateBtn, loading && styles.generateBtnLoading]}
                onPress={onSubmit}
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

            <Text style={styles.hint}>
              Cole o link de uma review do Letterboxd{'\n'}e transforme em um Story para Instagram
            </Text>
          </View>

          {/* Crédito */}
          <TouchableOpacity
            style={styles.creditFooter}
            onPress={() => Linking.openURL('https://wilsonwagn.vercel.app/')}
            activeOpacity={0.6}
          >
            <Text style={styles.creditText}>
              feito por <Text style={styles.creditName}>Wilson Wagner</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#050505' },
  centeredContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 24,
  },
  bgGlow: {
    position: 'absolute',
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(204,255,0,0.03)',
    top: SCREEN_H * 0.15, left: -60,
  },
  bgGlow2: {
    position: 'absolute',
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(204,255,0,0.02)',
    bottom: SCREEN_H * 0.15, right: -40,
  },
  centeredContent: { width: '100%', maxWidth: 360, alignItems: 'center' },
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
  logoSub: {
    fontSize: 11, fontFamily: Typography.fontMedium,
    color: 'rgba(255,255,255,0.25)', letterSpacing: 4,
    textTransform: 'uppercase', marginTop: 6,
  },
  inputCard: {
    width: '100%', backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20, padding: 20, gap: 14,
  },
  inputLabel: { fontSize: 10, fontFamily: Typography.fontSemiBold, color: 'rgba(255,255,255,0.3)', letterSpacing: 2 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)', borderRadius: 12,
    paddingHorizontal: 16, height: 48,
    fontSize: 14, fontFamily: Typography.fontRegular, color: '#fff',
  },
  generateBtn: {
    backgroundColor: Colors.accent, borderRadius: 12, height: 48,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
  },
  generateBtnLoading: { opacity: 0.8 },
  generateBtnText: { fontSize: 15, fontFamily: Typography.fontBold, color: '#000', letterSpacing: 0.3 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hint: { marginTop: 24, fontSize: 12, fontFamily: Typography.fontRegular, color: 'rgba(255,255,255,0.15)', textAlign: 'center', lineHeight: 18 },
  creditFooter: { marginTop: 40, paddingVertical: 12, alignItems: 'center' },
  creditText: { fontSize: 11, fontFamily: Typography.fontRegular, color: 'rgba(255,255,255,0.2)' },
  creditName: { fontFamily: Typography.fontSemiBold, color: 'rgba(255,255,255,0.35)', textDecorationLine: 'underline' },
});
