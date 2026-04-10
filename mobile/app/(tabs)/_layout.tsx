import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Colors, Typography } from '../../constants/theme';

interface TabIconProps {
  focused: boolean;
  label: string;
  icon: string;
}

function TabIcon({ focused, label, icon }: TabIconProps) {
  return (
    <View style={[styles.tabItem, focused && styles.tabItemFocused]}>
      <Text style={[styles.tabEmoji, focused && styles.tabEmojiFocused]}>{icon}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>{label}</Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="Recap" icon="✦" />
          ),
        }}
      />
      <Tabs.Screen
        name="diary"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="Diário" icon="▶" />
          ),
        }}
      />
      <Tabs.Screen
        name="story"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="Story" icon="◎" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="Perfil" icon="◈" />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface1,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    height: Platform.OS === 'ios' ? 88 : 68,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 56,
    gap: 2,
  },
  tabItemFocused: {
    backgroundColor: Colors.accentDim,
  },
  tabEmoji: {
    fontSize: 18,
    color: Colors.textMuted,
  },
  tabEmojiFocused: {
    color: Colors.accent,
  },
  tabLabel: {
    fontSize: Typography.xs,
    fontFamily: Typography.fontMedium,
    color: Colors.textMuted,
  },
  tabLabelFocused: {
    color: Colors.accent,
    fontFamily: Typography.fontSemiBold,
  },
});
