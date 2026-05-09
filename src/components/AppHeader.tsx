import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme, fonts } from '../context/ThemeContext';
import { Avatar, Icon } from './ui';

type Props = {
  userName: string;
  onLogout: () => void;
  title?: string;
};

export function AppHeader({ userName, title = 'VisitPlan' }: Props) {
  const { theme, isDark, setMode } = useTheme();

  return (
    <View style={[s.bar, {
      backgroundColor: theme.surface,
      borderBottomColor: theme.border,
    }]}>
      {/* Left: brand mark + title */}
      <View style={s.left}>
        <View style={[s.brandSquare, { backgroundColor: theme.primary }]}>
          <Icon.BrandMark size={20} color="#fff" />
        </View>
        <Text style={[s.title, { color: theme.text, fontFamily: fonts.display }]}>
          {title}
        </Text>
      </View>

      {/* Right: theme toggle, bell, avatar */}
      <View style={s.right}>
        <Pressable
          onPress={() => setMode(isDark ? 'light' : 'dark')}
          style={({ pressed }) => [s.iconBtn, pressed && { opacity: 0.6 }]}
          hitSlop={6}
        >
          {isDark ? <Icon.Sun size={18} color={theme.textSecondary} /> : <Icon.Moon size={18} color={theme.textSecondary} />}
        </Pressable>
        <Pressable style={({ pressed }) => [s.iconBtn, pressed && { opacity: 0.6 }]} hitSlop={6}>
          <Icon.Bell size={18} color={theme.textSecondary} />
        </Pressable>
        <Avatar name={userName} size={32} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandSquare: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
});
