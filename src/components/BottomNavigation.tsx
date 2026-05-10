import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme, fonts } from '../context/ThemeContext';
import { Icon } from './ui';
import type { UserRole } from '../types';

export type AppPage = 'today' | 'visits' | 'clients' | 'reports' | 'profile';

type IconKey = 'Home' | 'Calendar' | 'Building' | 'Chart' | 'User';
type NavItem = { id: AppPage; label: string; icon: IconKey };

const NAV: NavItem[] = [
  { id: 'today',    label: 'Today',    icon: 'Home' },
  { id: 'visits',   label: 'Plan',     icon: 'Calendar' },
  { id: 'clients',  label: 'Clients',  icon: 'Building' },
  { id: 'reports',  label: 'Reports',  icon: 'Chart' },
  { id: 'profile',  label: 'Profile',  icon: 'User' },
];

export function BottomNavigation({
  activePage,
  onChangePage,
}: {
  activePage: AppPage;
  onChangePage: (page: AppPage) => void;
  role?: UserRole;
}) {
  const { theme } = useTheme();
  return (
    <View style={[s.shell, {
      backgroundColor: theme.surface,
      borderTopColor: theme.divider,
    }]}>
      {NAV.map((item) => {
        const active = item.id === activePage;
        const IconCmp = Icon[item.icon];
        const color = active ? theme.primary : theme.textFaint;
        return (
          <Pressable
            key={item.id}
            onPress={() => onChangePage(item.id)}
            style={({ pressed }) => [s.btn, pressed && { opacity: 0.7 }]}
          >
            {active ? <View style={[s.indicator, { backgroundColor: theme.primary }]} /> : null}
            <IconCmp size={22} color={color} />
            <Text style={[s.label, {
              color, fontFamily: fonts.body,
              fontWeight: active ? '700' : '500',
            }]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  shell: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row',
    paddingTop: 8, paddingBottom: 14, paddingHorizontal: 0,
    borderTopWidth: 1,
  },
  btn: {
    flex: 1, alignItems: 'center', paddingVertical: 4,
    gap: 3,
  },
  label: { fontSize: 10 },
  indicator: {
    position: 'absolute', top: 0,
    width: 24, height: 3, borderRadius: 2,
  },
});
