import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme, fonts, radii } from '../context/ThemeContext';
import { getVisitOutcomes, getVisits, getVisitsByAm } from '../lib/cockpit';
import type { FilterRecord } from '../lib/cockpit';
import type { CockpitUser, CockpitVisit, CockpitVisitOutcome, UserRole } from '../types';
import { Badge, Card, FilterTab } from './ui';

type Period = 'week' | 'month' | 'quarter' | 'all';

type Props = {
  user: CockpitUser;
  role?: UserRole;
  onOpenTeamReport?: () => void;
};

function toIsoDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCurrentWeekWindow() {
  const today = startOfDay(new Date());
  const monday = new Date(today);
  const dayIndex = (today.getDay() + 6) % 7;
  monday.setDate(today.getDate() - dayIndex);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: toIsoDate(monday), to: toIsoDate(sunday), monday, sunday };
}

function getDateWindow(period: Period) {
  const today = startOfDay(new Date());
  const from = new Date(today);
  const to = new Date(today);
  switch (period) {
    case 'week':
      from.setDate(today.getDate() - 6);
      break;
    case 'month':
      from.setDate(today.getDate() - 29);
      break;
    case 'quarter':
      from.setMonth(today.getMonth() - 3);
      break;
    case 'all':
      return null;
  }
  return { from: toIsoDate(from), to: toIsoDate(to) };
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
  const scheduled = visits.filter((v) => v.status === 'scheduled' || v.status === 'in_progress').length;
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

function parsePipelineValue(nextAction?: string | null) {
  if (!nextAction) return 0;
  const match = nextAction.match(/pipeline value:\s*usd\s*([\d,]+)/i);
  if (!match) return 0;
  const value = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(value) ? value : 0;
}

function formatCurrencyCompact(value: number) {
  if (!value) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function isSameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function fmtTimeRange(visit: CockpitVisit) {
  const formatTime = (time?: string | null) => {
    if (!time) return null;
    const [hourRaw, minuteRaw] = time.split(':');
    const hour = Number(hourRaw);
    const minute = Number(minuteRaw);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return time;
    const suffix = hour < 12 ? 'AM' : 'PM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}`;
  };

  const start = formatTime(visit.start_time);
  const end = formatTime(visit.end_time);
  if (start && end) return `${start} - ${end}`;
  return start || end || 'No time set';
}

function statusTone(status: CockpitVisit['status']): 'success' | 'warn' | 'error' | 'info' {
  if (status === 'completed') return 'success';
  if (status === 'missed') return 'error';
  if (status === 'in_progress') return 'info';
  return 'warn';
}

function statusLabel(status: CockpitVisit['status']) {
  if (status === 'in_progress') return 'In Progress';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function ReportsScreen({ user, role, onOpenTeamReport }: Props) {
  const { theme } = useTheme();
  const effectiveRole: UserRole = role ?? (user.role as UserRole);
  const isMgmt = effectiveRole === 'admin' || effectiveRole === 'management';
  const [tab, setTab] = useState<'mine' | 'team'>('mine');
  const [period, setPeriod] = useState<Period>('month');
  const [visits, setVisits] = useState<CockpitVisit[]>([]);
  const [weekVisits, setWeekVisits] = useState<CockpitVisit[]>([]);
  const [visitOutcomes, setVisitOutcomes] = useState<CockpitVisitOutcome[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const dateWindow = getDateWindow(period);
      const currentWeekWindow = getCurrentWeekWindow();
      const filter: FilterRecord = {};
      if (dateWindow) filter['date'] = { $gte: dateWindow.from, $lte: dateWindow.to };

      let data: CockpitVisit[];
      let currentWeekData: CockpitVisit[];
      if (isMgmt) {
        [data, currentWeekData] = await Promise.all([
          getVisits({ filter, limit: 1000, sort: { date: -1, start_time: -1 } }),
          getVisits({ filter: { date: { $gte: currentWeekWindow.from, $lte: currentWeekWindow.to } }, limit: 1000, sort: { date: 1, start_time: 1 } }),
        ]);
      } else {
        [data, currentWeekData] = await Promise.all([
          getVisitsByAm(user._id, {
            limit: 1000,
            sort: { date: -1, start_time: -1 },
            dateFrom: dateWindow?.from,
            dateTo: dateWindow?.to,
          }),
          getVisitsByAm(user._id, {
            limit: 1000,
            sort: { date: 1, start_time: 1 },
            dateFrom: currentWeekWindow.from,
            dateTo: currentWeekWindow.to,
          }),
        ]);
      }
      const outcomes = await getVisitOutcomes({ limit: 1000 });
      setVisits(data);
      setWeekVisits(currentWeekData);
      setVisitOutcomes(outcomes);
      setError(null);
    } catch {
      setError('Could not load reports.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [period, user._id, isMgmt]);

  const stats = computeStats(visits);
  const successRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  const currentWeekWindow = useMemo(() => getCurrentWeekWindow(), []);
  const currentWeekRangeLabel = `${currentWeekWindow.monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${currentWeekWindow.sunday.toLocaleDateString('en-US', { day: 'numeric' })}`;
  const pipelineValue = useMemo(() => {
    const visitIds = new Set(visits.map((visit) => visit._id));
    return visitOutcomes.reduce((sum, outcome) => {
      if (!outcome.visit?._id || !visitIds.has(outcome.visit._id)) return sum;
      return sum + parsePipelineValue(outcome.next_action);
    }, 0);
  }, [visitOutcomes, visits]);
  const weekBars = useMemo(() => {
    const monday = new Date(`${currentWeekWindow.from}T00:00:00`);
    const bars = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      const iso = toIsoDate(date);
      const count = weekVisits.filter((visit) => visit.date === iso).length;
      return {
        key: iso,
        label: date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1),
        count,
      };
    });
    const max = Math.max(...bars.map((bar) => bar.count), 1);
    return { bars, max };
  }, [currentWeekWindow.from, weekVisits]);

  const recentGroups = useMemo(() => {
    const sorted = [...visits]
      .filter((visit) => visit.date)
      .sort((left, right) => {
        const leftKey = `${left.date ?? ''} ${left.start_time ?? ''}`;
        const rightKey = `${right.date ?? ''} ${right.start_time ?? ''}`;
        return rightKey.localeCompare(leftKey);
      })
      .slice(0, 12);

    const today = startOfDay(new Date());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const groups = new Map<string, CockpitVisit[]>();

    for (const visit of sorted) {
      const date = new Date(`${visit.date}T00:00:00`);
      const label = isSameDay(date, today)
        ? `Today · ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        : isSameDay(date, yesterday)
          ? `Yesterday · ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
          : date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
      const bucket = groups.get(label) ?? [];
      bucket.push(visit);
      groups.set(label, bucket);
    }

    return Array.from(groups.entries());
  }, [visits]);

  const styles = StyleSheet.create({
    hero: { paddingHorizontal: 16, paddingBottom: 8 },
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, paddingBottom: 8 },
    kpiCard: { width: '31.8%', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4 },
    kpiValue: { fontSize: 18, fontWeight: '700', fontFamily: fonts.display },
    kpiLabel: { fontSize: 9, color: theme.textSecondary, marginTop: 2 },
    kpiLabelAccent: { fontSize: 9, color: theme.textSecondary, marginTop: 1, textTransform: 'uppercase' },
    chartCard: { marginHorizontal: 16, marginBottom: 8, padding: 12 },
    chartRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 78, marginTop: 10 },
    chartCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
    chartCount: { fontSize: 10, fontWeight: '700', color: theme.textSecondary, marginBottom: 6 },
    chartBarTrack: {
      width: 18,
      height: 48,
      borderRadius: radii.md,
      backgroundColor: theme.surfaceOffset,
      justifyContent: 'flex-end',
      overflow: 'hidden',
    },
    chartBar: {
      width: '100%',
      borderRadius: radii.md,
      backgroundColor: theme.primary,
      minHeight: 6,
    },
    chartLabel: { fontSize: 10, color: theme.textSecondary, marginTop: 6 },
    teamBanner: {
      marginHorizontal: 16,
      marginTop: 6,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: theme.primaryLight,
      borderRadius: radii.md,
    },
    sectionLabel: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: theme.textSecondary,
      paddingHorizontal: 16,
      paddingTop: 2,
      paddingBottom: 2,
    },
    historyCard: { marginHorizontal: 16, padding: 0, overflow: 'hidden' },
    historyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
    datePill: {
      width: 48,
      borderRadius: radii.md,
      alignItems: 'center',
      paddingVertical: 6,
      backgroundColor: theme.surfaceOffset,
      flexShrink: 0,
    },
    emptyCard: { marginHorizontal: 16, alignItems: 'center', paddingVertical: 18 },
  });

  const PERIODS: { key: Period; label: string }[] = [
    { key: 'week', label: '7 Days' },
    { key: 'month', label: '30 Days' },
    { key: 'quarter', label: '3 Months' },
    { key: 'all', label: 'All Time' },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.primary} />
      }
      contentContainerStyle={{ paddingBottom: 110, paddingTop: 12 }}
    >
      <View style={styles.hero}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text, fontFamily: fonts.display }}>Reports</Text>
      </View>

      <View style={styles.kpiGrid}>
        <Card style={styles.kpiCard}>
          <Text style={[styles.kpiValue, { color: theme.text }]}>{stats.total}</Text>
          <Text style={styles.kpiLabel}>Visits</Text>
        </Card>
        <Card style={styles.kpiCard}>
          <Text style={[styles.kpiValue, { color: theme.success }]}>{successRate}%</Text>
          <Text style={styles.kpiLabel}>Success</Text>
        </Card>
        <Card style={styles.kpiCard}>
          <Text style={[styles.kpiValue, { color: theme.primary }]}>{formatCurrencyCompact(pipelineValue)}</Text>
          <Text style={styles.kpiLabel}>USD</Text>
        </Card>
        <Card style={styles.kpiCard}>
          <Text style={[styles.kpiValue, { color: theme.success }]}>{stats.completed}</Text>
          <Text style={styles.kpiLabel}>Completed</Text>
        </Card>
        <Card style={styles.kpiCard}>
          <Text style={[styles.kpiValue, { color: theme.text }]}>{stats.scheduled}</Text>
          <Text style={styles.kpiLabel}>Scheduled</Text>
        </Card>
        <Card style={styles.kpiCard}>
          <Text style={[styles.kpiValue, { color: theme.error }]}>{stats.missed}</Text>
          <Text style={styles.kpiLabel}>Missed</Text>
        </Card>
      </View>

      <Card style={styles.chartCard}>
        <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textSecondary }}>
          {`Visits This Week (${currentWeekRangeLabel})`}
        </Text>
        <View style={styles.chartRow}>
          {weekBars.bars.map((bar) => (
            <View key={bar.key} style={styles.chartCol}>
              <Text style={styles.chartCount}>{bar.count}</Text>
              <View style={styles.chartBarTrack}>
                <View style={[styles.chartBar, { height: `${Math.max((bar.count / weekBars.max) * 100, bar.count > 0 ? 12 : 0)}%` as `${number}%`, opacity: bar.count > 0 ? 1 : 0.25 }]} />
              </View>
              <Text style={styles.chartLabel}>{bar.label}</Text>
            </View>
          ))}
        </View>
      </Card>

      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 10 }}>
        <FilterTab label="My Reports" active={tab === 'mine'} onPress={() => setTab('mine')} />
        {isMgmt && (
          <FilterTab
            label="Teams"
            active={tab === 'team'}
            onPress={() => {
              setTab('team');
              onOpenTeamReport?.();
            }}
          />
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 10, gap: 8 }}>
        {PERIODS.map((p) => (
          <View
            key={p.key}
          >
            <FilterTab label={p.label} active={period === p.key} onPress={() => setPeriod(p.key)} />
          </View>
        ))}
      </ScrollView>

      {isMgmt ? (
        <Pressable
          onPress={onOpenTeamReport}
          style={({ pressed }) => [styles.teamBanner, pressed && { opacity: 0.85 }]}
        >
          <Text style={{ fontSize: 10, color: theme.primary, fontWeight: '600' }}>
            Q2 2026 · All users · Team Overview lives in Reports → Teams
          </Text>
        </Pressable>
      ) : null}

      {error && <Text style={{ color: theme.error, textAlign: 'center', margin: 16 }}>{error}</Text>}

      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <View>
          <Text style={styles.sectionLabel}>Recent Activity</Text>
          {recentGroups.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={{ fontSize: 14, color: theme.textSecondary }}>No report data found for this period.</Text>
            </Card>
          ) : (
            recentGroups.map(([label, rows]) => (
              <View key={label}>
                <Text style={styles.sectionLabel}>{label}</Text>
                <Card style={styles.historyCard}>
                  {rows.map((visit, index) => (
                    <View
                      key={visit._id}
                      style={[styles.historyRow, index < rows.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.divider }]}
                    >
                      <View style={styles.datePill}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text, fontFamily: fonts.display }}>
                          {new Date(`${visit.date}T00:00:00`).getDate()}
                        </Text>
                        <Text style={{ fontSize: 9, color: theme.textSecondary }}>
                          {new Date(`${visit.date}T00:00:00`).toLocaleDateString('en-US', { month: 'short' })}
                        </Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text, fontFamily: fonts.display }} numberOfLines={1}>
                          {visit.client?.name ?? visit.title}
                        </Text>
                        <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }} numberOfLines={1}>
                          {visit.assigned_am?.name ?? user.name} · {fmtTimeRange(visit)}
                        </Text>
                        <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }} numberOfLines={1}>
                          {visit.status === 'completed'
                            ? 'Completed visit logged'
                            : visit.status === 'missed'
                              ? 'Missed visit needs follow-up'
                              : visit.status === 'in_progress'
                                ? 'Visit is currently in progress'
                                : 'Visit scheduled'}
                        </Text>
                      </View>
                      <Badge tone={statusTone(visit.status)}>{statusLabel(visit.status)}</Badge>
                    </View>
                  ))}
                </Card>
              </View>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}
