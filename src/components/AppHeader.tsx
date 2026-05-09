import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

type Props = {
  userName: string;
  onLogout: () => void;
  title?: string;
};

export function AppHeader({ userName, onLogout, title = 'BIM Visitplan' }: Props) {
  const { theme, isDark, setMode } = useTheme();

  const initials = userName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <View style={[s.bar, { backgroundColor: theme.primary }]}>
      <Text style={s.title}>{title}</Text>
      <View style={s.right}>
        <Pressable
          onPress={() => setMode(isDark ? 'light' : 'dark')}
          style={({ pressed }) => [s.iconBtn, pressed && s.pressed]}
          hitSlop={8}
          accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <Text style={s.iconText}>{isDark ? '☀️' : '🌙'}</Text>
        </Pressable>
        <View style={[s.avatar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
        <Text style={s.userName} numberOfLines={1}>{userName.split(' ')[0]}</Text>
        <Pressable
          onPress={onLogout}
          style={({ pressed }) => [s.iconBtn, pressed && s.pressed]}
          hitSlop={8}
          accessibilityLabel="Log out"
        >
          <Text style={s.logoutIcon}>⏻</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
    maxWidth: 80,
  },
  iconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  pressed: { opacity: 0.6 },
  logoutIcon: {
    fontSize: 15,
    color: '#FFFFFF',
  },
  iconText: {
    fontSize: 14,
  },
});
