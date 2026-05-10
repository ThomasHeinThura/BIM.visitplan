import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme, fonts, radii } from '../context/ThemeContext';
import { Badge, Card } from './ui';

export type AmKey = 'thida' | 'kyaw' | 'nilar' | 'aung' | 'su';

export type AmRow = {
  key: AmKey;
  initials: string;
  name: string;
  sector: string;
  sectorColor: 'teal' | 'purple' | 'orange' | 'warn';
  clients: number;
  visits: number;
  pipelineUsd: number;
  status: { tone: 'success' | 'error' | 'warning' | 'muted'; emoji: string; text: string };
};

export const AM_DATA: AmRow[] = [
  {
    key: 'thida',
    initials: 'TM',
    name: 'Thida Myint',
    sector: 'ES',
    sectorColor: 'teal',
    clients: 5,
    visits: 18,
    pipelineUsd: 96_000,
    status: { tone: 'success', emoji: '🟢', text: 'Active — Dagon Beer' },
  },
  {
    key: 'kyaw',
    initials: 'KK',
    name: 'Kyaw Ko Ko',
    sector: 'Infra',
    sectorColor: 'purple',
    clients: 4,
    visits: 14,
    pipelineUsd: 74_000,
    status: { tone: 'error', emoji: '⚠️', text: '2 outcomes overdue' },
  },
  {
    key: 'nilar',
    initials: 'NL',
    name: 'Nilar Lwin',
    sector: 'App',
    sectorColor: 'orange',
    clients: 3,
    visits: 12,
    pipelineUsd: 58_000,
    status: { tone: 'warning', emoji: '🟡', text: 'Planning — next at 2PM' },
  },
  {
    key: 'aung',
    initials: 'AK',
    name: 'Aung Kyaw Zin',
    sector: 'Infra',
    sectorColor: 'purple',
    clients: 3,
    visits: 11,
    pipelineUsd: 52_000,
    status: { tone: 'success', emoji: '🟢', text: 'Active — MPT HQ' },
  },
  {
    key: 'su',
    initials: 'SS',
    name: 'Su Su Hlaing',
    sector: 'MS',
    sectorColor: 'warn',
    clients: 2,
    visits: 9,
    pipelineUsd: 31_000,
    status: { tone: 'muted', emoji: '🔵', text: 'Idle — last visit 6 days ago' },
  },
];

export const AM_VISITS: Record<AmKey, Array<{
  date: string;
  bucket: string;
  client: string;
  time: string;
  outcome: string;
  status: 'done' | 'pending' | 'noshow';
}>> = {
  thida: [
    { date: 'May 8', bucket: 'May · This week', client: 'KBZ Bank', time: '10:00 · Strategy review', outcome: '✅ Positive · $24K pipeline', status: 'done' },
    { date: 'May 6', bucket: 'May · This week', client: 'AYA Bank', time: '14:30 · Quarterly check-in', outcome: '✅ Positive · $18K pipeline', status: 'done' },
    { date: 'May 3', bucket: 'May · This week', client: 'CB Bank', time: '11:00 · Renewal discussion', outcome: '🟡 Neutral · $12K pipeline', status: 'pending' },
    { date: 'Apr 28', bucket: 'April', client: 'UAB Bank', time: '15:00 · Solution demo', outcome: '✅ Positive · $20K pipeline', status: 'done' },
    { date: 'Apr 22', bucket: 'April', client: 'KBZ Bank', time: '09:30 · Stakeholder meet', outcome: '⚠️ No-show · rebooked May 14', status: 'noshow' },
    { date: 'Apr 18', bucket: 'April', client: 'Yoma Bank', time: '13:00 · Discovery', outcome: '✅ Positive · $22K pipeline', status: 'done' },
  ],
  kyaw: [
    { date: 'May 9', bucket: 'May · This week', client: 'MPT', time: '10:00 · Roadmap review', outcome: '✅ Positive · $28K pipeline', status: 'done' },
    { date: 'May 5', bucket: 'May · This week', client: 'Ooredoo', time: '14:00 · Renewal', outcome: '🟡 Pending outcome', status: 'pending' },
    { date: 'Apr 30', bucket: 'April', client: 'ATOM', time: '11:00 · Workshop', outcome: '🟡 Pending outcome', status: 'pending' },
    { date: 'Apr 24', bucket: 'April', client: 'MPT', time: '15:00 · Discovery', outcome: '✅ Positive · $18K pipeline', status: 'done' },
  ],
  nilar: [
    { date: 'May 10', bucket: 'May · This week', client: 'Wave Money', time: '14:00 · Planning session', outcome: '🟡 Scheduled', status: 'pending' },
    { date: 'May 4', bucket: 'May · This week', client: 'KBZ Pay', time: '10:30 · Demo', outcome: '✅ Positive · $14K pipeline', status: 'done' },
  ],
  aung: [
    { date: 'May 9', bucket: 'May · This week', client: 'MPT HQ', time: '09:00 · On-site', outcome: '🟢 In-progress', status: 'pending' },
    { date: 'May 2', bucket: 'May · This week', client: 'Telenor', time: '13:00 · Renewal', outcome: '✅ Positive · $26K pipeline', status: 'done' },
  ],
  su: [
    { date: 'May 4', bucket: 'May · This week', client: 'Mytel', time: '11:00 · Discovery', outcome: '✅ Positive · $11K pipeline', status: 'done' },
  ],
};

const SECTOR_COLOR: Record<AmRow['sectorColor'], { bg: string; fg: string }> = {
  teal: { bg: 'rgba(20,192,174,0.18)', fg: '#0a8a7c' },
  purple: { bg: 'rgba(167,139,250,0.18)', fg: '#7c3aed' },
  orange: { bg: 'rgba(251,146,60,0.18)', fg: '#c2410c' },
  warn: { bg: 'rgba(251,191,36,0.18)', fg: '#92400e' },
};

const TONE_COLOR: Record<AmRow['status']['tone'], string> = {
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
  muted: '#64748b',
};

type Props = { onBack: () => void; onOpenAm: (key: AmKey) => void };

export default function TeamReportScreen({ onBack, onOpenAm }: Props) {
  const { theme } = useTheme();

  const totalVisits = AM_DATA.reduce((sum, a) => sum + a.visits, 0);
  const totalPipeline = AM_DATA.reduce((sum, a) => sum + a.pipelineUsd, 0);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      {/* Header */}
      <View style={s.hero}> 
        <Pressable onPress={onBack} hitSlop={10} style={[s.backBtn, { backgroundColor: theme.surface }]}> 
          <Text style={[s.backIcon, { color: theme.text }]}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[s.eyebrow, { color: theme.textFaint }]}>Team Overview</Text>
          <Text style={[s.title, { color: theme.text }]}>My Clients and AM Activity</Text>
          <Text style={[s.subtitle, { color: theme.textSecondary }]}>
            Q2 2026 · Apr–Jun · {AM_DATA.length} AMs
          </Text>
        </View>
      </View>

      {/* KPI strip */}
      <View style={s.kpiStrip}>
        <KpiCell value={String(totalVisits)} label="Visits" theme={theme} />
        <KpiCell value="82%" label="Completed" theme={theme} accent={theme.success} />
        <KpiCell value={`$${(totalPipeline / 1000).toFixed(0)}K`} label="Pipeline" theme={theme} accent={theme.primary} />
      </View>

      {/* Sort tabs */}
      <View style={s.tabs}>
        {['By Visits', 'By Pipeline', 'By Sector'].map((t, i) => (
          <View
            key={t}
            style={[
              s.tab,
              {
                backgroundColor: i === 0 ? theme.primaryLight : theme.surface,
                borderColor: i === 0 ? theme.primary : theme.border,
              },
            ]}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: i === 0 ? theme.primary : theme.textSecondary,
                fontFamily: fonts.display,
              }}
            >
              {t}
            </Text>
          </View>
        ))}
      </View>

      <Text style={[s.caption, { color: theme.textSecondary }]}>Account Managers · Q2</Text>

      {/* AM list */}
      <Card style={s.card}> 
        {AM_DATA.map((am, idx) => {
          const sc = SECTOR_COLOR[am.sectorColor];
          return (
            <Pressable
              key={am.key}
              onPress={() => onOpenAm(am.key)}
              style={({ pressed }) => [
                s.amRow,
                idx < AM_DATA.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.divider },
                pressed && { opacity: 0.6 },
              ]}
            >
              <View style={[s.amAvatar, { backgroundColor: theme.primaryLight }]}> 
                <Text style={s.amAvatarText}>{am.initials}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[s.amName, { color: theme.text }]}>{am.name}</Text>
                <View style={{ flexDirection: 'row', gap: 4, marginTop: 2 }}>
                  <Badge tone="muted">{am.sector}</Badge>
                  <Badge tone="teal">{am.clients} clients</Badge>
                </View>
                <Text style={[s.amStatus, { color: TONE_COLOR[am.status.tone] }]}>
                  {am.status.emoji} {am.status.text}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[s.amVisits, { color: theme.text }]}>{am.visits}</Text>
                <Text style={[s.amPipe, { color: theme.textSecondary }]}>
                  visits · ${(am.pipelineUsd / 1000).toFixed(0)}K
                </Text>
              </View>
              <Text style={[s.chev, { color: theme.textFaint }]}>›</Text>
            </Pressable>
          );
        })}
      </Card>

      <Text style={[s.footnote, { color: theme.textSecondary }]}>
        Tap an AM to see their Q2 visit list
      </Text>
    </ScrollView>
  );
}

function KpiCell({ value, label, theme, accent }: { value: string; label: string; theme: any; accent?: string }) {
  return (
    <Card style={s.kpi}> 
      <Text style={[s.kpiVal, { color: accent || theme.text }]}>{value}</Text>
      <Text style={[s.kpiLbl, { color: theme.textSecondary }]}>{label}</Text>
    </Card>
  );
}

const s = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingTop: 18, gap: 12 },
  backBtn: { padding: 8, borderRadius: radii.full },
  backIcon: { fontSize: 24, fontWeight: '300' },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { fontSize: 24, fontWeight: '700', fontFamily: fonts.display },
  subtitle: { fontSize: 12, marginTop: 4 },
  kpiStrip: { flexDirection: 'row', gap: 8, padding: 12 },
  kpi: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  kpiVal: { fontSize: 18, fontWeight: '700', fontFamily: fonts.display },
  kpiLbl: { fontSize: 10, marginTop: 2 },
  tabs: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingBottom: 8 },
  tab: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radii.full, borderWidth: 1 },
  caption: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 6,
  },
  card: { marginHorizontal: 16, borderRadius: radii.lg, overflow: 'hidden', padding: 0 },
  amRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },
  amAvatar: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amAvatarText: { color: '#0f172a', fontSize: 12, fontWeight: '700', fontFamily: fonts.display },
  amName: { fontSize: 13, fontWeight: '700', fontFamily: fonts.display },
  amStatus: { fontSize: 10, fontWeight: '600', marginTop: 3 },
  amVisits: { fontSize: 16, fontWeight: '700', fontFamily: fonts.display },
  amPipe: { fontSize: 9 },
  chev: { fontSize: 18, marginLeft: 4 },
  footnote: { fontSize: 10, textAlign: 'center', paddingVertical: 12 },
});
