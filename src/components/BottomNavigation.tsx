import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { UserRole } from '../types';

export type AppPage = 'today' | 'visits' | 'clients' | 'team' | 'admin' | 'reports';

type NavItem = { id: AppPage; label: string; icon: string };

const ADMIN_NAV: NavItem[] = [
  { id: 'today', label: 'Today', icon: '🏠' },
  { id: 'visits', label: 'Visits', icon: '📋' },
  { id: 'clients', label: 'Clients', icon: '🏢' },
  { id: 'team', label: 'Team', icon: '👥' },
  { id: 'admin', label: 'Admin', icon: '⚙️' },
];

const AM_NAV: NavItem[] = [
  { id: 'today', label: 'Today', icon: '🏠' },
  { id: 'visits', label: 'Visits', icon: '📋' },
  { id: 'clients', label: 'Clients', icon: '🏢' },
  { id: 'reports', label: 'Reports', icon: '📊' },
];

export function BottomNavigation({
  activePage,
  onChangePage,
  role,
}: {
  activePage: AppPage;
  onChangePage: (page: AppPage) => void;
  role: UserRole;
}) {
  const items = role === 'admin' ? ADMIN_NAV : AM_NAV;

  return (
    <View style={s.shell}>
      <View style={s.bar}>
        {items.map((item) => {
          const active = item.id === activePage;
          return (
            <Pressable
              key={item.id}
              onPress={() => onChangePage(item.id)}
              style={({ pressed }) => [s.btn, pressed && s.pressed]}
            >
              <Text style={s.icon}>{item.icon}</Text>
              <Text style={[s.label, active && s.labelActive]}>{item.label}</Text>
              {active && <View style={s.indicator} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  shell: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingBottom: 20, paddingHorizontal: 16,
  },
  bar: {
    flexDirection: 'row', backgroundColor: '#1C3F5E',
    borderRadius: 20, paddingVertical: 8, paddingHorizontal: 8,
    elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 12,
  },
  btn: {
    flex: 1, alignItems: 'center', paddingVertical: 6,
    borderRadius: 12, position: 'relative',
  },
  pressed: { opacity: 0.7 },
  icon: { fontSize: 18, marginBottom: 2 },
  label: { fontSize: 10, color: '#94A3B8', fontWeight: '500' },
  labelActive: { color: '#FFFFFF', fontWeight: '700' },
  indicator: {
    position: 'absolute', bottom: 2, width: 4, height: 4,
    borderRadius: 2, backgroundColor: '#E8A838',
  },
});