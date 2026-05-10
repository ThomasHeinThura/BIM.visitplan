import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useTheme, fonts, radii } from '../context/ThemeContext';
import { getVisits, getVisitsByAm } from '../lib/cockpit';
import type { CockpitUser, CockpitVisit } from '../types';
import { Badge, Card, FAB, Icon, SectionHead, VisitItem } from './ui';

type Props = {
  user: CockpitUser;
  onOpenVisit?: (visit: CockpitVisit) => void;
  onAddVisit?: () => void;
  onEditVisit?: (visit: CockpitVisit) => void;
};

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_HDR = ['M','T','W','T','F','S','S'];

function pad(n: number) { return String(n).padStart(2, '0'); }
function toISO(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}
function todayISO() { return new Date().toISOString().slice(0, 10); }

function startOfWeekISO(isoDate: string) {
  const current = new Date(`${isoDate}T00:00:00`);
  const dayIndex = (current.getDay() + 6) % 7;
  current.setDate(current.getDate() - dayIndex);
  return toISO(current.getFullYear(), current.getMonth(), current.getDate());
}

function buildWeekDays(anchorIsoDate: string) {
  const start = new Date(`${startOfWeekISO(anchorIsoDate)}T00:00:00`);
  return Array.from({ length: 7 }, (_, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    return {
      iso: toISO(current.getFullYear(), current.getMonth(), current.getDate()),
      label: current.toLocaleDateString('en-US', { weekday: 'short' }),
      fullLabel: current.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      dayNumber: current.getDate(),
    };
  });
}

function fmtTime(t?: string | null) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const hour = h % 12 || 12;
  return `${hour}:${pad(m)} ${ampm}`;
}

/** Build 6-row x 7-col grid starting at Monday for the given month. */
function buildGrid(year: number, month: number): { iso: string; day: number; otherMonth: boolean }[] {
  const first = new Date(year, month, 1);
  // 0=Sun..6=Sat — convert to Mon=0..Sun=6
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: { iso: string; day: number; otherMonth: boolean }[] = [];

  // leading days from previous month
  const prevDays = new Date(year, month, 0).getDate();
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = prevDays - i;
    const dt = new Date(year, month - 1, d);
    cells.push({
      iso: toISO(dt.getFullYear(), dt.getMonth(), dt.getDate()),
      day: d, otherMonth: true,
    });
  }
  // current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ iso: toISO(year, month, d), day: d, otherMonth: false });
  }
  // trailing days to fill 6 weeks
  while (cells.length < 42) {
    const idx = cells.length - (startOffset + daysInMonth);
    const d = idx + 1;
    const dt = new Date(year, month + 1, d);
    cells.push({
      iso: toISO(dt.getFullYear(), dt.getMonth(), dt.getDate()),
      day: d, otherMonth: true,
    });
  }
  return cells;
}

export default function VisitListScreen({ user, onOpenVisit, onAddVisit, onEditVisit }: Props) {
  const { theme } = useTheme();
  const today = todayISO();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<string>(today);
  const [visits, setVisits] = useState<CockpitVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const grid = useMemo(() => buildGrid(year, month), [year, month]);
  const visibleRangeStartISO = grid[0]?.iso ?? toISO(year, month, 1);
  const visibleRangeEndISO = grid[grid.length - 1]?.iso ?? toISO(year, month, new Date(year, month + 1, 0).getDate());
  const weekDays = useMemo(() => buildWeekDays(selected), [selected]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      let data: CockpitVisit[];
      if (user.role === 'am' || user.role === 'sales' || user.role === 'solution') {
        data = await getVisitsByAm(user._id, {
          limit: 300,
          sort: { date: 1, start_time: 1 },
          dateFrom: visibleRangeStartISO,
          dateTo: visibleRangeEndISO,
        });
      } else {
        data = await getVisits({
          filter: { date: { $gte: visibleRangeStartISO, $lte: visibleRangeEndISO } },
          limit: 300,
          sort: { date: 1, start_time: 1 },
        });
      }
      setVisits(data);
      setError(null);
    } catch {
      setError('Could not load visits.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user._id, user.role, visibleRangeStartISO, visibleRangeEndISO]);

  useEffect(() => { load(); }, [load]);
  const hasVisitSet = useMemo(() => {
    const s = new Set<string>();
    for (const v of visits) if (v.date) s.add(v.date);
    return s;
  }, [visits]);

  const weekVisitGroups = useMemo(
    () => weekDays.map((day) => ({
      ...day,
      visits: visits
        .filter((visit) => visit.date === day.iso)
        .sort((left, right) => (left.start_time ?? '').localeCompare(right.start_time ?? '')),
    })),
    [visits, weekDays],
  );
  const weekVisitCount = weekVisitGroups.reduce((sum, day) => sum + day.visits.length, 0);

  const goPrev = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const goNext = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const selectedLabel = (() => {
    const d = new Date(selected + 'T00:00:00');
    const same = selected === today;
    const lbl = d.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
    return same ? `${lbl} · Today` : lbl;
  })();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  const cellSize = 40;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 128, paddingTop: 12 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.primary} />
        }
      >
        <View style={{ paddingHorizontal: 16 }}>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Pressable
                onPress={goPrev}
                hitSlop={10}
                style={({ pressed }) => [{
                  width: 32, height: 32, borderRadius: radii.full,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: theme.surfaceOffset,
                }, pressed && { opacity: 0.7 }]}
              >
                <Text style={{ fontSize: 16, color: theme.text, fontWeight: '700' }}>‹</Text>
              </Pressable>
              <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text, fontFamily: fonts.display }}>
                {MONTHS[month]} {year}
              </Text>
              <Pressable
                onPress={goNext}
                hitSlop={10}
                style={({ pressed }) => [{
                  width: 32, height: 32, borderRadius: radii.full,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: theme.surfaceOffset,
                }, pressed && { opacity: 0.7 }]}
              >
                <Text style={{ fontSize: 16, color: theme.text, fontWeight: '700' }}>›</Text>
              </Pressable>
            </View>

            {/* day headers */}
            <View style={{ flexDirection: 'row' }}>
              {DAY_HDR.map((h, i) => (
                <View key={i} style={{ flex: 1, alignItems: 'center', paddingBottom: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textFaint, letterSpacing: 0.5 }}>
                    {h}
                  </Text>
                </View>
              ))}
            </View>

            {/* day grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {grid.map((c) => {
                const isToday = c.iso === today;
                const isSelected = c.iso === selected;
                const hasVisit = hasVisitSet.has(c.iso);
                return (
                  <Pressable
                    key={c.iso + (c.otherMonth ? '-o' : '')}
                    onPress={() => setSelected(c.iso)}
                    style={({ pressed }) => [{
                      width: `${100/7}%`,
                      height: cellSize,
                      alignItems: 'center', justifyContent: 'center',
                    }, pressed && { opacity: 0.7 }]}
                  >
                    <View style={{
                      width: cellSize - 6,
                      height: cellSize - 6,
                      borderRadius: radii.full,
                      alignItems: 'center', justifyContent: 'center',
                      backgroundColor: isToday ? theme.primary
                        : isSelected ? theme.primaryLight
                        : 'transparent',
                      borderWidth: isSelected && !isToday ? 1 : 0,
                      borderColor: theme.primary,
                    }}>
                      <Text style={{
                        fontSize: 13,
                        fontWeight: isSelected || isToday ? '700' : '500',
                        color: isToday ? '#fff'
                          : c.otherMonth ? theme.textFaint
                          : isSelected ? theme.primary
                          : theme.text,
                      }}>
                        {c.day}
                      </Text>
                    </View>
                    {hasVisit && !isToday ? (
                      <View style={{
                        width: 4, height: 4, borderRadius: 2,
                        backgroundColor: theme.accent,
                        position: 'absolute', bottom: 4,
                      }} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </Card>
        </View>

        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 16, marginTop: 12, marginBottom: 8,
        }}>
          <Text style={{
            fontSize: 13, fontWeight: '700', color: theme.text,
            fontFamily: fonts.display,
          }}>
            {selectedLabel} · Current Week
          </Text>
          <Badge tone="teal">
            {weekVisitCount} visit{weekVisitCount !== 1 ? 's' : ''}
          </Badge>
        </View>

        {error ? (
          <View style={{ paddingHorizontal: 16, marginTop: 4 }}>
            <Card><Text style={{ color: theme.error, fontSize: 13 }}>{error}</Text></Card>
          </View>
        ) : null}

        <View style={{ paddingHorizontal: 16 }}>
          {weekVisitCount === 0 ? (
            <Card>
              <Text style={{
                fontSize: 14, color: theme.textSecondary,
                textAlign: 'center', paddingVertical: 16,
              }}>
                No visits scheduled for this week.
              </Text>
            </Card>
          ) : (
            <View style={{ gap: 10 }}>
              {weekVisitGroups.map((day) => (
                <Card key={day.iso} padded={false}>
                  <View style={{
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderBottomWidth: day.visits.length > 0 ? 1 : 0,
                    borderBottomColor: theme.divider,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <View>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text, fontFamily: fonts.display }}>
                        {day.fullLabel}
                      </Text>
                      <Text style={{ fontSize: 11, color: day.iso === today ? theme.primary : theme.textSecondary, marginTop: 2 }}>
                        {day.iso === today ? 'Today' : 'Scheduled visits'}
                      </Text>
                    </View>
                    <Badge tone={day.iso === selected ? 'teal' : 'muted'}>
                      {day.visits.length} visit{day.visits.length !== 1 ? 's' : ''}
                    </Badge>
                  </View>

                  {day.visits.length === 0 ? (
                    <View style={{ paddingHorizontal: 14, paddingVertical: 14 }}>
                      <Text style={{ fontSize: 13, color: theme.textSecondary }}>No visits scheduled.</Text>
                    </View>
                  ) : (
                    day.visits.map((v) => (
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
                    ))
                  )}
                </Card>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {onAddVisit ? <FAB onPress={onAddVisit} /> : null}
    </View>
  );
}
