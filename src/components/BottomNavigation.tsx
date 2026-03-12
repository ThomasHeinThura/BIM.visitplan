import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { styles } from '../styles';

export type AppPage = 'visitplans' | 'clients' | 'review';

const NAV_ITEMS: Array<{ id: AppPage; label: string }> = [
  { id: 'visitplans', label: 'Visitplan' },
  { id: 'clients', label: 'Client' },
  { id: 'review', label: 'Review' },
];

export function BottomNavigation({
  activePage,
  onChangePage,
}: {
  activePage: AppPage;
  onChangePage: (page: AppPage) => void;
}) {
  return (
    <View style={styles.bottomNavShell}>
      <View style={styles.bottomNavCard}>
        {NAV_ITEMS.map((item) => {
          const active = item.id === activePage;

          return (
            <Pressable
              key={item.id}
              onPress={() => onChangePage(item.id)}
              style={({ pressed }) => [
                styles.bottomNavButton,
                active ? styles.bottomNavButtonActive : null,
                pressed ? styles.bottomNavButtonPressed : null,
              ]}
            >
              <Text style={active ? styles.bottomNavButtonTextActive : styles.bottomNavButtonText}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}