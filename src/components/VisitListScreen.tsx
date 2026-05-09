import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { getVisits, getVisitsByAm } from '../lib/cockpit';
import type { CockpitUser, CockpitVisit } from '../types';

type Period = 'today' | 'week' | 'month' | 'all';

type Props = {
  user: CockpitUser;
  onOpenVisit?: (visit: CockpitVisit) => void;
  onAddVisit?: () => void;
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function weekStart() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

function monthStart() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function fmtDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' });
}

function fmtTime(t: string | null | undefined) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function statusColor(theme: ReturnType<typeof useTheme>['theme'], status: CockpitVisit['status']) {
  switch (status) {
    case 'scheduled': return theme.info;
    case 'in_progress': return theme.warning;
    case 'completed': return theme.success;
    case 'missed': return theme.error;
  }
}

const PERIOD_LABELS: { id: Period; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'all', label: 'All' },
];

export default function VisitListScreen({ user, onOpenVisit, onAddVisit }: Props) {
  const { theme } = useTheme();
  const [visits, setVisits] = useState<CockpitVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<Period>('week');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const filter: Record<string, string> = {};
      if (period === 'today') {
        filter['date'] = todayStr();
      } else if (period === 'week') {
        filter['date[$gte]'] = weekStart();
      } else if (period === 'month') {
        filter['date[$gte]'] = monthStart();
      }

      let data: CockpitVisit[];
      if (user.role === 'am') {
        data = await getVisitsByAm(user._id, { limit: 100 });
        // client-side date filter for am
        if (period === 'today') {
          data = data.filter((v) => v.date === todayStr());
        } else if (period === 'week') {
          data = data.filter((v) => v.date != null && v.date >= weekStart());
        } else if (period === 'month') {
          data = data.filter((v) => v.date != null && v.date >= monthStart());
        }
      } else {
        const apiFilter: Record<string, string> = {};
        if (period === 'today') apiFilter['date'] = todayStr();
        else if (period === 'week') apiFilter['date[$gte]'] = weekStart();
        else if (period === 'month') apiFilter['date[$gte]'] = monthStart();
        data = await getVisits({ filter: apiFilter, limit: 200, sort: { date: -1 } });
      }
      setVisits(data);
    } catch {
      setError('Could not load visits.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user._id, user.role, period]);

  useEffect(() => { load(); }, [load]);

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    periodRow: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 6,
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.bg,
    },
    chipActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    chipText: { fontSize: 12, fontWeight: '500', color: theme.textSecondary },
    chipTextActive: { color: '#FFFFFF', fontWeight: '700' },
    visitItem: {
      marginHorizontal: 12,
      marginTop: 8,
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.border,
    },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    visitTitle: { fontSize: 14, fontWeight: '600', color: theme.text, flex: 1, marginRight: 8 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
    statusText: { fontSize: 11, fontWeight: '600', color: '#FFFFFF' },
    clientName: { fontSize: 12, color: theme.textSecondary, marginTop: 3 },
    visitMeta: { fontSize: 12, color: theme.textSecondary, marginTop: 3 },
    amName: { fontSize: 11, color: theme.info, marginTop: 2 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyText: { fontSize: 15, color: theme.textSecondary, textAlign: 'center' },
    emptyHint: { fontSize: 13, color: theme.textSecondary, marginTop: 8, textAlign: 'center' },
    errText: { color: theme.error, textAlign: 'center', margin: 12 },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 100,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.accent,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
    },
    fabText: { fontSize: 28, color: '#FFFFFF', lineHeight: 30 },
    sectionHeader: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 4,
      fontSize: 12,
      fontWeight: '700',
      color: theme.textSecondary,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    countText: {
      paddingHorizontal: 16,
      paddingTop: 6,
      fontSize: 12,
      color: theme.textSecondary,
    },
  });

  if (loading) {
    return (
      <View style={[s.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* Period filter chips */}
      <View style={s.periodRow}>
        {PERIOD_LABELS.map(({ id, label }) => (
          <Pressable
            key={id}
            style={[s.chip, period === id && s.chipActive]}
            onPress={() => setPeriod(id)}
          >
            <Text style={[s.chipText, period === id && s.chipTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        style={{ flex: 1 }}
        data={visits}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={
          <>
            {error && <Text style={s.errText}>{error}</Text>}
            {!error && (
              <Text style={s.countText}>{visits.length} visit{visits.length !== 1 ? 's' : ''}</Text>
            )}
          </>
        }
        renderItem={({ item: v }) => (
          <TouchableOpacity
            style={s.visitItem}
            onPress={() => onOpenVisit?.(v)}
            activeOpacity={0.75}
          >
            <View style={s.topRow}>
              <Text style={s.visitTitle} numberOfLines={1}>{v.title}</Text>
              <View style={[s.statusBadge, { backgroundColor: statusColor(theme, v.status) }]}>
                <Text style={s.statusText}>{v.status.replace('_', ' ')}</Text>
              </View>
            </View>
            {v.client?.name && (
              <Text style={s.clientName}>🏢 {v.client.name}</Text>
            )}
            <Text style={s.visitMeta}>
              📅 {fmtDate(v.date)}
              {v.start_time ? `  ·  ${fmtTime(v.start_time)}` : ''}
              {v.end_time ? ` – ${fmtTime(v.end_time)}` : ''}
            </Text>
            {v.location ? <Text style={s.visitMeta}>📍 {v.location}</Text> : null}
            {user.role === 'admin' && v.assigned_am?.name && (
              <Text style={s.amName}>👤 {v.assigned_am.name}</Text>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <View style={s.empty}>
            <Text style={s.emptyText}>No visits for this period.</Text>
            {onAddVisit && (
              <Text style={s.emptyHint}>Tap + to schedule a visit.</Text>
            )}
          </View>
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={theme.primary}
          />
        }
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      {/* FAB */}
      {onAddVisit && (
        <Pressable
          style={({ pressed }) => [s.fab, pressed && { opacity: 0.8 }]}
          onPress={onAddVisit}
          accessibilityLabel="Add new visit"
        >
          <Text style={s.fabText}>+</Text>
        </Pressable>
      )}
    </View>
  );
}
