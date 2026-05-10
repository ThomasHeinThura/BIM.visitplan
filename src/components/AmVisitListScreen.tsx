import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme, fonts, radii } from '../context/ThemeContext';
import { getUsers, getVisitOutcomes, getVisits } from '../lib/cockpit';
import type { CockpitUser, CockpitVisit, CockpitVisitOutcome } from '../types';
import { formatMeetingGroup } from '../utils/meetingGroups';
import { Card } from './ui';

type Filter = 'all' | 'done' | 'pending' | 'noshow';

type VisitListRow = {
  id: string;
  bucket: string;
  date: string;
  client: string;
  time: string;
  outcome: string;
  status: Filter;
};

type Props = {
  amUserId: string;
  onBack: () => void;
};

function getQuarterWindow(base = new Date()) {
  const quarterIndex = Math.floor(base.getMonth() / 3);
  const start = new Date(base.getFullYear(), quarterIndex * 3, 1);
  const end = new Date(base.getFullYear(), quarterIndex * 3 + 3, 0);
  return {
    quarterLabel: `Q${quarterIndex + 1} ${base.getFullYear()}`,
    from: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`,
    to: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`,
  };
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatTime(value?: string | null) {
  if (!value) return 'No time';
  const [hourRaw = '0', minuteRaw = '0'] = value.split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return value;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}`;
}

function parsePipelineValue(nextAction?: string | null) {
  if (!nextAction) return 0;
  const match = nextAction.match(/pipeline value:\s*usd\s*([\d,]+)/i);
  if (!match) return 0;
  const value = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(value) ? value : 0;
}

function formatOutcome(visit: CockpitVisit, outcome?: CockpitVisitOutcome) {
  if (outcome) {
    const pipeline = parsePipelineValue(outcome.next_action);
    const tone = outcome.result === 'positive' ? '✅ Positive'
      : outcome.result === 'negative' ? '❌ Negative'
      : outcome.result === 'no_show' ? '⚠️ No-show'
      : '🟡 Neutral';
    return pipeline > 0 ? `${tone} · $${Math.round(pipeline / 1000)}K pipeline` : tone;
  }
  if (visit.status === 'missed') return '⚠️ No-show';
  if (visit.status === 'completed') return '✅ Completed';
  if (visit.status === 'in_progress') return '🟢 In-progress';
  return '🟡 Scheduled';
}

function formatBucket(dateIso?: string | null) {
  if (!dateIso) return 'No date';
  const date = new Date(`${dateIso}T00:00:00`);
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  if (date >= weekStart && date <= weekEnd) {
    return `${date.toLocaleDateString('en-US', { month: 'long' })} · This week`;
  }
  return date.toLocaleDateString('en-US', { month: 'long' });
}

export default function AmVisitListScreen({ amUserId, onBack }: Props) {
  const { theme } = useTheme();
  const [filter, setFilter] = useState<Filter>('all');
  const [am, setAm] = useState<CockpitUser | null>(null);
  const [visits, setVisits] = useState<VisitListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const quarterWindow = useMemo(() => getQuarterWindow(), []);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [users, quarterVisits, outcomes] = await Promise.all([
        getUsers({ filter: { _id: amUserId }, limit: 1 }),
        getVisits({ filter: { date: { $gte: quarterWindow.from, $lte: quarterWindow.to } }, limit: 2000, sort: { date: -1, start_time: -1 } }),
        getVisitOutcomes({ limit: 2000 }),
      ]);

      const selectedUser = users[0] ?? null;
      const userVisits = quarterVisits.filter((visit) => visit.assigned_am?._id === amUserId);
      const outcomesByVisitId = new Map(outcomes.filter((outcome) => outcome.visit?._id).map((outcome) => [outcome.visit!._id, outcome]));
      const rows: VisitListRow[] = userVisits.map((visit) => ({
        id: visit._id,
        bucket: formatBucket(visit.date),
        date: visit.date ? new Date(`${visit.date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No date',
        client: visit.client?.name ?? visit.title,
        time: `${formatTime(visit.start_time)} · ${visit.title}`,
        outcome: formatOutcome(visit, outcomesByVisitId.get(visit._id)),
        status: visit.status === 'completed' ? 'done' : visit.status === 'missed' ? 'noshow' : 'pending',
      }));

      setAm(selectedUser);
      setVisits(rows);
      setError(null);
    } catch {
      setError('Could not load AM visit data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { void load(); }, [amUserId, quarterWindow.from, quarterWindow.to]);

  const filtered = useMemo(() => {
    if (filter === 'all') return visits;
    return visits.filter((visit) => visit.status === filter);
  }, [visits, filter]);

  const grouped = useMemo(() => {
    const map = new Map<string, VisitListRow[]>();
    filtered.forEach((visit) => {
      const bucket = map.get(visit.bucket) ?? [];
      bucket.push(visit);
      map.set(visit.bucket, bucket);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const stats = useMemo(() => {
    const done = visits.filter((visit) => visit.status === 'done').length;
    const pending = visits.filter((visit) => visit.status === 'pending').length;
    const noshow = visits.filter((visit) => visit.status === 'noshow').length;
    return { total: visits.length, done, pending, noshow };
  }, [visits]);

  if (loading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg }}><ActivityIndicator color={theme.primary} /></View>;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.primary} />}
    >
      <View style={s.hero}> 
        <Pressable onPress={onBack} hitSlop={10} style={[s.backBtn, { backgroundColor: theme.surface }]}> 
          <Text style={[s.backIcon, { color: theme.text }]}>‹</Text>
        </Pressable>
        <View style={[s.amAvatar, { backgroundColor: theme.primary }]}> 
          <Text style={s.amAvatarText}>{getInitials(am?.name ?? '--')}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[s.title, { color: theme.text }]} numberOfLines={1}>
            {am?.name ?? 'Unknown user'}
          </Text>
          <Text style={[s.subtitle, { color: theme.textSecondary }]}> 
            {formatMeetingGroup(am?.meeting_group)} · {visits.length} visits · {quarterWindow.quarterLabel}
          </Text>
        </View>
      </View>

      <View style={s.statStrip}>
        <Stat val={stats.total} lbl="Total" theme={theme} />
        <Stat val={stats.done} lbl="Done" theme={theme} color="#22c55e" />
        <Stat val={stats.pending} lbl="Pending" theme={theme} color="#f59e0b" />
        <Stat val={stats.noshow} lbl="No-show" theme={theme} color="#ef4444" />
      </View>

      <View style={s.chips}>
        {(
          [
            { id: 'all', label: 'All' },
            { id: 'done', label: 'Done' },
            { id: 'pending', label: 'Pending' },
            { id: 'noshow', label: 'No-show' },
          ] as { id: Filter; label: string }[]
        ).map((chip) => {
          const active = filter === chip.id;
          return (
            <Pressable
              key={chip.id}
              onPress={() => setFilter(chip.id)}
              style={[s.chip, { backgroundColor: active ? theme.primaryLight : theme.surface, borderColor: active ? theme.primary : theme.border }]}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: active ? theme.primary : theme.textSecondary, fontFamily: fonts.display }}>
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error ? <Text style={{ color: theme.error, textAlign: 'center', marginHorizontal: 16, marginBottom: 8 }}>{error}</Text> : null}
      {grouped.length === 0 ? (
        <Text style={[s.empty, { color: theme.textSecondary }]}>No visits match this filter.</Text>
      ) : (
        grouped.map(([bucket, rows]) => (
          <View key={bucket} style={{ paddingHorizontal: 16, marginBottom: 14 }}>
            <Text style={[s.bucket, { color: theme.textSecondary }]}>{bucket}</Text>
            <Card style={s.card}> 
              {rows.map((visit, index) => (
                <View
                  key={visit.id}
                  style={[s.row, index < rows.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.divider }]}
                >
                  <View style={[s.dateBox, { backgroundColor: theme.primaryLight }]}> 
                    <Text style={[s.dateText, { color: theme.text }]}>{visit.date}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[s.client, { color: theme.text }]}>{visit.client}</Text>
                    <Text style={[s.meta, { color: theme.textSecondary }]} numberOfLines={1}>{visit.time}</Text>
                    <Text style={[s.outcome, { color: theme.textSecondary }]} numberOfLines={1}>{visit.outcome}</Text>
                  </View>
                </View>
              ))}
            </Card>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function Stat({ val, lbl, theme, color }: { val: number; lbl: string; theme: any; color?: string }) {
  return (
    <Card style={s.stat}> 
      <Text style={[s.statVal, { color: color || theme.text }]}>{val}</Text>
      <Text style={[s.statLbl, { color: theme.textSecondary }]}>{lbl}</Text>
    </Card>
  );
}

const s = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 18, gap: 12 },
  backBtn: { padding: 8, borderRadius: radii.full },
  backIcon: { fontSize: 24, fontWeight: '300' },
  amAvatar: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  amAvatarText: { color: '#fff', fontWeight: '700', fontSize: 12, fontFamily: fonts.display },
  title: { fontSize: 18, fontWeight: '700', fontFamily: fonts.display },
  subtitle: { fontSize: 11, marginTop: 2 },
  statStrip: { flexDirection: 'row', gap: 6, padding: 12 },
  stat: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  statVal: { fontSize: 16, fontWeight: '700', fontFamily: fonts.display },
  statLbl: { fontSize: 9, marginTop: 2 },
  chips: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radii.full, borderWidth: 1 },
  empty: { textAlign: 'center', fontSize: 12, paddingVertical: 24 },
  bucket: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  card: { borderRadius: radii.lg, overflow: 'hidden', padding: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  dateBox: { width: 50, paddingVertical: 6, borderRadius: radii.md, alignItems: 'center' },
  dateText: { fontSize: 11, fontWeight: '700', fontFamily: fonts.display },
  client: { fontSize: 13, fontWeight: '700', fontFamily: fonts.display },
  meta: { fontSize: 11, marginTop: 2 },
  outcome: { fontSize: 11, marginTop: 1 },
});
