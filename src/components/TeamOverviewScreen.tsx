import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { getUsers, getVisits } from '../lib/cockpit';
import type { CockpitUser } from '../types';

type AMRow = {
  user: CockpitUser;
  total: number;
  completed: number;
  scheduled: number;
};

type Props = {
  currentUser: CockpitUser;
};

export default function TeamOverviewScreen({ currentUser }: Props) {
  const { theme } = useTheme();
  const [rows, setRows] = useState<AMRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [ams, visits] = await Promise.all([
        getUsers({ filter: { role: 'am' } }),
        getVisits({ limit: 1000, sort: { date: -1 } }),
      ]);

      const built: AMRow[] = ams.map((am) => {
        const mine = visits.filter((v) => v.assigned_am?._id === am._id);
        return {
          user: am,
          total: mine.length,
          completed: mine.filter((v) => v.status === 'completed').length,
          scheduled: mine.filter((v) => v.status === 'scheduled').length,
        };
      });

      built.sort((a, b) => b.total - a.total);
      setRows(built);
      setError(null);
    } catch {
      setError('Could not load team data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    header: {
      paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12,
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: theme.text },
    headerSub: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },
    card: {
      backgroundColor: theme.surface, marginHorizontal: 16, marginBottom: 10,
      borderRadius: 12, padding: 16, elevation: 1,
      shadowColor: theme.cardShadow, shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 1, shadowRadius: 4,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    name: { fontSize: 15, fontWeight: '600', color: theme.text },
    totalBadge: {
      backgroundColor: theme.primary, borderRadius: 20, paddingHorizontal: 10,
      paddingVertical: 3,
    },
    totalText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    meta: { fontSize: 12, color: theme.textSecondary, marginTop: 4 },
    statsRow: { flexDirection: 'row', gap: 16, marginTop: 10 },
    stat: { alignItems: 'center' },
    statNum: { fontSize: 18, fontWeight: '700', color: theme.primary },
    statLabel: { fontSize: 10, color: theme.textSecondary, marginTop: 1 },
    divider: {
      width: 1, height: 36, backgroundColor: theme.border,
      alignSelf: 'center',
    },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyText: { fontSize: 15, color: theme.textSecondary, textAlign: 'center' },
    errText: { color: theme.error, textAlign: 'center', margin: 16 },
  });

  if (loading) {
    return <View style={s.loader}><ActivityIndicator color={theme.primary} /></View>;
  }

  return (
    <FlatList
      style={{ backgroundColor: theme.bg }}
      ListHeaderComponent={() => (
        <View style={s.header}>
          <Text style={s.headerTitle}>Team Overview</Text>
          <Text style={s.headerSub}>{rows.length} active AM{rows.length !== 1 ? 's' : ''}</Text>
          {error && <Text style={s.errText}>{error}</Text>}
        </View>
      )}
      data={rows}
      keyExtractor={(item) => item.user._id}
      renderItem={({ item }) => (
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.name}>{item.user.name}</Text>
            <View style={s.totalBadge}>
              <Text style={s.totalText}>{item.total} visits</Text>
            </View>
          </View>
          {(item.user.team) && (
            <Text style={s.meta}>
              {item.user.team}
            </Text>
          )}
          <View style={s.statsRow}>
            <View style={s.stat}>
              <Text style={[s.statNum, { color: theme.success }]}>{item.completed}</Text>
              <Text style={s.statLabel}>Completed</Text>
            </View>
            <View style={s.divider} />
            <View style={s.stat}>
              <Text style={[s.statNum, { color: theme.info }]}>{item.scheduled}</Text>
              <Text style={s.statLabel}>Scheduled</Text>
            </View>
            <View style={s.divider} />
            <View style={s.stat}>
              <Text style={[s.statNum, { color: theme.error }]}>
                {item.total - item.completed - item.scheduled}
              </Text>
              <Text style={s.statLabel}>Other</Text>
            </View>
          </View>
        </View>
      )}
      ListEmptyComponent={
        <View style={s.empty}>
          <Text style={s.emptyText}>No AMs found.</Text>
        </View>
      }
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.primary} />
      }
      contentContainerStyle={{ paddingBottom: 100 }}
    />
  );
}
