import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { getUsername } from '../services/storage';
import { Colors } from '../constants/theme';

// Entry point: redirect to onboarding or tabs based on saved username
export default function Index() {
  const router = useRouter();

  useEffect(() => {
    getUsername().then(username => {
      if (username) {
        router.replace('/(tabs)');
      } else {
        router.replace('/onboarding');
      }
    });
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={Colors.accent} size="large" />
    </View>
  );
}
