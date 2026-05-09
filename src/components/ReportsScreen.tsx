import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { getVisits, getVisitsByAm } from '../lib/cockpit';
import type { FilterRecord } from '../lib/cockpit';
import type { CockpitUser, CockpitVisit, UserRole } from '../types';

type Period = 'week' | 'month' | 'quarter' | 'all';

type Props = {
  user: CockpitUser;
  role?: UserRole;
  onOpenTeamReport?: () => void;
};

function getDateRange(period: Period) {
  const now = new Date();
  const from = new Date(now);
  switch (period) {
    case 'week':
      from.setDate(now.getDate() - 7);
      break;
    case 'month':
      from.setMonth(now.getMonth() - 1);
      break;
    case 'quarter':
      from.setMonth(now.getMonth() - 3);
      break;
    case 'all':
      return null;
  }
  return from.toISOString().slice(0, 10);
}

type Stats = {
  total: number;
  completed: number;
  scheduled: number;
  missed: number;
  completionRate: number;
};

function computeStats(visits: CockpitVisit[]): Stats {
  const completed = visits.filter((v) => v.status === 'completed').length;
  const scheduled = visits.filter((v) => v.status === 'scheduled').length;
  const missed = visits.filter((v) => v.status === 'missed').length;
  const total = visits.length;
  return {
    total,
    completed,
    scheduled,
    missed,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

export default function ReportsScreen({ user, role, onOpenTeamReport }: Props) {
  const { theme } = useTheme();
  const effectiveRole: UserRole = role ?? (user.role as UserRole);
  const isMgmt = effectiveRole === 'admin' || effectiveRole === 'management';
  const [tab, setTab] = useState<'mine' | 'team'>('mine');
  const [period, setPeriod] = useState<Period>('month');
  const [visits, setVisits] = useState<CockpitVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const fromDate = getDateRange(period);
      const filter: FilterRecord = {};
      if (fromDate) filter['date'] = { $gte: fromDate };

      let data: CockpitVisit[];
      if (user.role === 'admin') {
        data = await getVisits({ filter, limit: 1000 });
      } else {
        data = await getVisitsByAm(user._id, { limit: 1000 });
        if (fromDate) data = data.filter((v) => v.date != null && v.date >= fromDate);
      }
      setVisits(data);
      setError(null);
    } catch {
      setError('Could not load reports.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [period, user._id]);

  const stats = computeStats(visits);

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    header: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 4 },
    title: { fontSize: 20, fontWeight: '700', color: theme.text },
    periodRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
    chip: {
      paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
      borderWidth: 1, borderColor: theme.border,
    },
    chipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    chipText: { fontSize: 13, color: theme.textSecondary },
    chipTextActive: { fontSize: 13, color: '#fff', fontWeight: '600' },
    card: {
      backgroundColor: theme.surface, marginHorizontal: 16, marginBottom: 12,
      borderRadius: 14, padding: 20, elevation: 1,
      shadowColor: theme.cardShadow, shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 1, shadowRadius: 4,
    },
    cardTitle: { fontSize: 13, color: theme.textSecondary, marginBottom: 6, fontWeight: '500' },
    bigNum: { fontSize: 40, fontWeight: '800', color: theme.primary },
    bigLabel: { fontSize: 14, color: theme.textSecondary, marginTop: 2 },
    rateRow: {
      flexDirection: 'row', justifyContent: 'space-between',
      backgroundColor: theme.surfaceAlt, borderRadius: 10, padding: 14, marginTop: 8,
    },
    rateStat: { alignItems: 'center', flex: 1 },
    rateNum: { fontSize: 22, fontWeight: '700' },
    rateLabel: { fontSize: 11, color: theme.textSecondary, marginTop: 2 },
    divider: { width: 1, backgroundColor: theme.border, alignSelf: 'stretch', marginVertical: 4 },
    progressBar: {
      height: 10, borderRadius: 5, backgroundColor: theme.border,
      marginTop: 12, overflow: 'hidden',
    },
    progressFill: { height: 10, borderRadius: 5, backgroundColor: theme.success },
    progressLabel: { fontSize: 12, color: theme.textSecondary, marginTop: 6 },
    errText: { color: theme.error, textAlign: 'center', margin: 16 },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  });

  const PERIODS: { key: Period; label: string }[] = [
    { key: 'week', label: '7 Days' },
    { key: 'month', label: '30 Days' },
    { key: 'quarter', label: '3 Months' },
    { key: 'all', label: 'All Time' },
  ];

  return (
    <ScrollView
      style={s.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.primary} />
      }
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      <View style={s.header}>
        <Text style={s.title}>Reports</Text>
      </View>

      {/* v2.4: Mine / Teams sub-tabs (Teams gated to admin/management) */}
      <View style={s.periodRow}>
        <TouchableOpacity
          style={[s.chip, tab === 'mine' && s.chipActive]}
          onPress={() => setTab('mine')}
        >
          <Text style={tab === 'mine' ? s.chipTextActive : s.chipText}>My Reports</Text>
        </TouchableOpacity>
        {isMgmt && (
          <TouchableOpacity
            style={[s.chip, tab === 'team' && s.chipActive]}
            onPress={() => {
              setTab('team');
              onOpenTeamReport?.();
            }}
          >
            <Text style={tab === 'team' ? s.chipTextActive : s.chipText}>Teams</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Period selector */}
      <View style={s.periodRow}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[s.chip, period === p.key && s.chipActive]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={period === p.key ? s.chipTextActive : s.chipText}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {error && <Text style={s.errText}>{error}</Text>}

      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* Total visits */}
          <View style={s.card}>
            <Text style={s.cardTitle}>TOTAL VISITS</Text>
            <Text style={s.bigNum}>{stats.total}</Text>
            <Text style={s.bigLabel}>visits logged</Text>
          </View>

          {/* Breakdown */}
          <View style={s.card}>
            <Text style={s.cardTitle}>BREAKDOWN</Text>
            <View style={s.rateRow}>
              <View style={s.rateStat}>
                <Text style={[s.rateNum, { color: theme.success }]}>{stats.completed}</Text>
                <Text style={s.rateLabel}>Completed</Text>
              </View>
              <View style={s.divider} />
              <View style={s.rateStat}>
                <Text style={[s.rateNum, { color: theme.info }]}>{stats.scheduled}</Text>
                <Text style={s.rateLabel}>Scheduled</Text>
              </View>
              <View style={s.divider} />
              <View style={s.rateStat}>
                <Text style={[s.rateNum, { color: theme.error }]}>{stats.missed}</Text>
                <Text style={s.rateLabel}>Missed</Text>
              </View>
            </View>
          </View>

          {/* Completion rate */}
          <View style={s.card}>
            <Text style={s.cardTitle}>COMPLETION RATE</Text>
            <Text style={[s.bigNum, { color: stats.completionRate >= 70 ? theme.success : stats.completionRate >= 40 ? theme.warning : theme.error }]}>
              {stats.completionRate}%
            </Text>
            <View style={s.progressBar}>
              <View style={[s.progressFill, {
                width: `${stats.completionRate}%` as `${number}%`,
                backgroundColor: stats.completionRate >= 70 ? theme.success : stats.completionRate >= 40 ? theme.warning : theme.error,
              }]} />
            </View>
            <Text style={s.progressLabel}>
              {stats.completed} of {stats.total} visits completed
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}
