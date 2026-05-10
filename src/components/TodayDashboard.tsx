import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useTheme, fonts } from '../context/ThemeContext';
import { getVisits, getVisitsByAm } from '../lib/cockpit';
import type { CockpitUser, CockpitVisit } from '../types';
import { Badge, Card, FAB, Icon, KPICard, SectionHead, VisitItem } from './ui';

type Props = {
  user: CockpitUser;
  onOpenVisit?: (visit: CockpitVisit) => void;
  onAddVisit?: () => void;
  onEditVisit?: (visit: CockpitVisit) => void;
  onOpenPlan?: () => void;
};

function todayStr() { return new Date().toISOString().slice(0, 10); }

function fmtTime(t?: string | null) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

export default function TodayDashboard({
  user, onOpenVisit, onAddVisit, onEditVisit, onOpenPlan,
}: Props) {
  const { theme } = useTheme();
  const [visits, setVisits] = useState<CockpitVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const t = todayStr();
      let all: CockpitVisit[];
      if (user.role === 'admin' || user.role === 'management') {
        all = await getVisits({ filter: { date: t }, limit: 100, sort: { start_time: 1 } });
      } else {
        all = await getVisitsByAm(user._id, { limit: 100 });
        all = all.filter((v) => v.date === t)
                 .sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''));
      }
      setVisits(all);
      setError(null);
    } catch {
      setError("Could not load today's visits.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user._id, user.role]);

  useEffect(() => { load(); }, [load]);

  const total = visits.length;
  const completed = visits.filter(v => v.status === 'completed').length;
  const pending = visits.filter(v => v.status === 'scheduled' || v.status === 'in_progress').length;
  const missed = visits.filter(v => v.status === 'missed').length;
  const coverage = total > 0 ? Math.round((completed / total) * 100) : 0;

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
  const firstName = (user.name || '').split(' ')[0] || user.name;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 128, paddingTop: 8 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.primary} />
        }
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 }}>
          <Text style={{
            fontSize: 13, fontWeight: '500', color: theme.textSecondary,
          }}>
            Good {getGreeting()},
          </Text>
          <Text style={{
            fontSize: 24, fontWeight: '700', color: theme.text,
            fontFamily: fonts.display,
          }}>
            {firstName}
          </Text>
          <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>
            {todayLabel}
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            <Badge tone="teal">{total} visit{total !== 1 ? 's' : ''} today</Badge>
            {pending > 0 ? <Badge tone="warn">{pending} pending</Badge> : null}
            {missed > 0 ? <Badge tone="error">{missed} missed</Badge> : null}
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16 }}>
          <KPICard value={completed} label="Done" accent={theme.text} delta={completed > 0 ? 'on track' : undefined} deltaTone="up" />
          <KPICard value={`${coverage}%`} label="Coverage" accent={theme.text} delta={coverage > 0 ? `+${coverage}%` : undefined} deltaTone="up" />
          <KPICard value={pending} label="Pending" accent={pending > 0 ? theme.warning : theme.text} delta={pending > 0 ? 'outcomes due' : undefined} deltaTone={pending > 0 ? 'down' : 'flat'} />
        </View>

        {error ? (
          <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
            <Card>
              <Text style={{ color: theme.error, fontSize: 13 }}>{error}</Text>
            </Card>
          </View>
        ) : null}

        {missed > 0 ? (
          <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
            <Card style={{
              backgroundColor: theme.warningLight,
              borderWidth: 1,
              borderColor: theme.warning,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}>
              <Icon.Bell size={18} color={theme.warning} />
              <Text style={{ flex: 1, fontSize: 12, color: theme.text, fontWeight: '600' }}>
                {missed} visit{missed !== 1 ? 's' : ''} missed — log outcomes to keep records up to date.
              </Text>
            </Card>
          </View>
        ) : null}

        <SectionHead
          title="Today's Schedule"
          action={onOpenPlan ? 'View Plan' : undefined}
          onAction={onOpenPlan}
        />
        <View style={{ paddingHorizontal: 16 }}>
          {visits.length === 0 ? (
            <Card>
              <Text style={{
                fontSize: 14, color: theme.textSecondary,
                textAlign: 'center', paddingVertical: 18,
              }}>
                No visits scheduled for today.
              </Text>
              {onAddVisit ? (
                <Text style={{
                  fontSize: 12, color: theme.textFaint,
                  textAlign: 'center', marginTop: 4,
                }}>
                  Tap + to schedule a visit.
                </Text>
              ) : null}
            </Card>
          ) : (
            <Card padded={false}>
              {visits.map((v) => (
                <VisitItem
                  key={v._id}
                  time={fmtTime(v.start_time)}
                  title={v.title}
                  client={v.client?.name ?? undefined}
                  location={v.location ?? undefined}
                  status={v.status}
                  onPress={() => onOpenVisit?.(v)}
                  onMore={onEditVisit ? () => onEditVisit(v) : undefined}
                />
              ))}
            </Card>
          )}
        </View>
      </ScrollView>

      {onAddVisit ? <FAB onPress={onAddVisit} /> : null}
    </View>
  );
}
