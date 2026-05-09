import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { AM_DATA, AM_VISITS, type AmKey } from './TeamReportScreen';

type Filter = 'all' | 'done' | 'pending' | 'noshow';

type Props = {
  amKey: AmKey;
  onBack: () => void;
};

export default function AmVisitListScreen({ amKey, onBack }: Props) {
  const { theme } = useTheme();
  const [filter, setFilter] = useState<Filter>('all');

  const am = AM_DATA.find((a) => a.key === amKey)!;
  const visits = AM_VISITS[amKey] || [];

  const filtered = useMemo(() => {
    if (filter === 'all') return visits;
    return visits.filter((v) => v.status === filter);
  }, [visits, filter]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    filtered.forEach((v) => {
      const arr = map.get(v.bucket) || [];
      arr.push(v);
      map.set(v.bucket, arr);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const stats = useMemo(() => {
    const done = visits.filter((v) => v.status === 'done').length;
    const pending = visits.filter((v) => v.status === 'pending').length;
    const noshow = visits.filter((v) => v.status === 'noshow').length;
    return { total: visits.length, done, pending, noshow };
  }, [visits]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      {/* Header */}
      <View style={[s.header, { backgroundColor: theme.surface, borderBottomColor: theme.divider }]}>
        <Pressable onPress={onBack} hitSlop={10} style={s.backBtn}>
          <Text style={[s.backIcon, { color: theme.text }]}>‹</Text>
        </Pressable>
        <View style={[s.amAvatar, { backgroundColor: theme.primary }]}>
          <Text style={s.amAvatarText}>{am.initials}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[s.title, { color: theme.text }]} numberOfLines={1}>
            {am.name}
          </Text>
          <Text style={[s.subtitle, { color: theme.textSecondary }]}>
            {am.sector} · {am.clients} clients · Q2 2026
          </Text>
        </View>
      </View>

      {/* Mini stats */}
      <View style={s.statStrip}>
        <Stat val={stats.total} lbl="Total" theme={theme} />
        <Stat val={stats.done} lbl="Done" theme={theme} color="#22c55e" />
        <Stat val={stats.pending} lbl="Pending" theme={theme} color="#f59e0b" />
        <Stat val={stats.noshow} lbl="No-show" theme={theme} color="#ef4444" />
      </View>

      {/* Filter chips */}
      <View style={s.chips}>
        {(
          [
            { id: 'all', label: 'All' },
            { id: 'done', label: 'Done' },
            { id: 'pending', label: 'Pending' },
            { id: 'noshow', label: 'No-show' },
          ] as { id: Filter; label: string }[]
        ).map((c) => {
          const active = filter === c.id;
          return (
            <Pressable
              key={c.id}
              onPress={() => setFilter(c.id)}
              style={[
                s.chip,
                {
                  backgroundColor: active ? theme.primary : theme.surfaceAlt,
                  borderColor: active ? theme.primary : theme.border,
                },
              ]}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: active ? '#fff' : theme.textSecondary }}>
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Grouped list */}
      {grouped.length === 0 && (
        <Text style={[s.empty, { color: theme.textSecondary }]}>No visits match this filter.</Text>
      )}

      {grouped.map(([bucket, rows]) => (
        <View key={bucket} style={{ paddingHorizontal: 16, marginBottom: 14 }}>
          <Text style={[s.bucket, { color: theme.textSecondary }]}>{bucket}</Text>
          <View style={[s.card, { backgroundColor: theme.surface }]}>
            {rows.map((v, i) => (
              <View
                key={`${bucket}-${i}`}
                style={[
                  s.row,
                  i < rows.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.divider },
                ]}
              >
                <View style={[s.dateBox, { backgroundColor: theme.surfaceAlt }]}>
                  <Text style={[s.dateText, { color: theme.text }]}>{v.date}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[s.client, { color: theme.text }]}>{v.client}</Text>
                  <Text style={[s.meta, { color: theme.textSecondary }]} numberOfLines={1}>
                    {v.time}
                  </Text>
                  <Text style={[s.outcome, { color: theme.textSecondary }]} numberOfLines={1}>
                    {v.outcome}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function Stat({ val, lbl, theme, color }: { val: number; lbl: string; theme: any; color?: string }) {
  return (
    <View style={[s.stat, { backgroundColor: theme.surface }]}>
      <Text style={[s.statVal, { color: color || theme.text }]}>{val}</Text>
      <Text style={[s.statLbl, { color: theme.textSecondary }]}>{lbl}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  backBtn: { padding: 4 },
  backIcon: { fontSize: 24, fontWeight: '300' },
  amAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  amAvatarText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  title: { fontSize: 15, fontWeight: '700' },
  subtitle: { fontSize: 11, marginTop: 1 },
  statStrip: { flexDirection: 'row', gap: 6, padding: 12 },
  stat: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  statVal: { fontSize: 16, fontWeight: '700' },
  statLbl: { fontSize: 9, marginTop: 2 },
  chips: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  empty: { textAlign: 'center', fontSize: 12, paddingVertical: 24 },
  bucket: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  card: { borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  dateBox: { width: 50, paddingVertical: 6, borderRadius: 8, alignItems: 'center' },
  dateText: { fontSize: 11, fontWeight: '700' },
  client: { fontSize: 13, fontWeight: '700' },
  meta: { fontSize: 11, marginTop: 2 },
  outcome: { fontSize: 11, marginTop: 1 },
});
