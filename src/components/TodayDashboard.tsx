import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { getVisits, getVisitsByAm } from '../lib/cockpit';
import type { CockpitUser, CockpitVisit } from '../types';

type Props = {
  user: CockpitUser;
  onOpenVisit?: (visit: CockpitVisit) => void;
};

type KPIData = {
  today: number;
  completed: number;
  scheduled: number;
  missed: number;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function fmtTime(t?: string | null) {
  if (!t) return '';
  return t.slice(0, 5);
}

function statusColor(theme: ReturnType<typeof useTheme>['theme'], status: string) {
  switch (status) {
    case 'completed': return theme.success;
    case 'in_progress': return theme.accent;
    case 'missed': return theme.error;
    default: return theme.info;
  }
}

export default function TodayDashboard({ user, onOpenVisit }: Props) {
  const { theme } = useTheme();
  const [visits, setVisits] = useState<CockpitVisit[]>([]);
  const [kpi, setKpi] = useState<KPIData>({ today: 0, completed: 0, scheduled: 0, missed: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const todayStr = today();
      let all: CockpitVisit[];
      if (user.role === 'admin') {
        all = await getVisits({ filter: { date: todayStr }, limit: 100, sort: { start_time: 1 } });
      } else {
        all = await getVisitsByAm(user._id, { limit: 100 });
        all = all.filter((v) => v.date === todayStr);
      }
      setVisits(all);
      setKpi({
        today: all.length,
        completed: all.filter((v) => v.status === 'completed').length,
        scheduled: all.filter((v) => v.status === 'scheduled').length,
        missed: all.filter((v) => v.status === 'missed').length,
      });
      setError(null);
    } catch {
      setError("Could not load today's visits.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [user._id]);

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
    greeting: { fontSize: 22, fontWeight: '700', color: theme.text },
    date: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },
    kpiRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: 16 },
    kpiCard: {
      flex: 1, backgroundColor: theme.surface, borderRadius: 12, padding: 14,
      alignItems: 'center', elevation: 2, shadowColor: theme.cardShadow,
      shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6,
    },
    kpiNum: { fontSize: 28, fontWeight: '800', color: theme.primary },
    kpiLabel: { fontSize: 11, color: theme.textSecondary, marginTop: 2, textAlign: 'center' },
    sectionTitle: {
      fontSize: 16, fontWeight: '600', color: theme.text,
      paddingHorizontal: 20, marginTop: 24, marginBottom: 8,
    },
    visitItem: {
      backgroundColor: theme.surface, marginHorizontal: 20, marginBottom: 10,
      borderRadius: 12, padding: 14, elevation: 1,
      shadowColor: theme.cardShadow, shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 1, shadowRadius: 4,
    },
    visitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    visitTitle: { fontSize: 15, fontWeight: '600', color: theme.text, flex: 1 },
    statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    statusText: { fontSize: 11, fontWeight: '600', color: '#fff' },
    clientName: { fontSize: 13, color: theme.textSecondary, marginTop: 4 },
    visitTime: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyText: { fontSize: 16, color: theme.textSecondary, textAlign: 'center' },
    errText: { color: theme.error, textAlign: 'center', margin: 16 },
  });

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  if (loading) {
    return (
      <View style={[s.container, s.empty]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: theme.bg }}
      ListHeaderComponent={() => (
        <View>
          <View style={s.header}>
            <Text style={s.greeting}>Good {getGreeting()}, {user.name.split(' ')[0]}</Text>
            <Text style={s.date}>{todayLabel}</Text>
          </View>
          <View style={s.kpiRow}>
            <View style={s.kpiCard}>
              <Text style={s.kpiNum}>{kpi.today}</Text>
              <Text style={s.kpiLabel}>Today's Visits</Text>
            </View>
            <View style={s.kpiCard}>
              <Text style={[s.kpiNum, { color: theme.success }]}>{kpi.completed}</Text>
              <Text style={s.kpiLabel}>Completed</Text>
            </View>
            <View style={s.kpiCard}>
              <Text style={[s.kpiNum, { color: theme.error }]}>{kpi.missed}</Text>
              <Text style={s.kpiLabel}>Missed</Text>
            </View>
          </View>
          <Text style={s.sectionTitle}>Today's Schedule</Text>
          {error && <Text style={s.errText}>{error}</Text>}
        </View>
      )}
      data={visits}
      keyExtractor={(item) => item._id}
      renderItem={({ item: v }) => (
        <TouchableOpacity
          style={s.visitItem}
          onPress={() => onOpenVisit?.(v)}
          activeOpacity={0.75}
        >
          <View style={s.visitRow}>
            <Text style={s.visitTitle} numberOfLines={1}>{v.title}</Text>
            <View style={[s.statusBadge, { backgroundColor: statusColor(theme, v.status) }]}>
              <Text style={s.statusText}>{v.status.replace('_', ' ')}</Text>
            </View>
          </View>
          {v.client?.name && <Text style={s.clientName}>{v.client.name}</Text>}
          <Text style={s.visitTime}>
            {fmtTime(v.start_time)}{v.end_time ? ` – ${fmtTime(v.end_time)}` : ''}
            {v.location ? `  ·  ${v.location}` : ''}
          </Text>
        </TouchableOpacity>
      )}
      ListEmptyComponent={() => (
        <View style={s.empty}>
          <Text style={s.emptyText}>No visits scheduled for today.</Text>
        </View>
      )}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.primary} />
      }
      contentContainerStyle={{ paddingBottom: 100 }}
    />
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
