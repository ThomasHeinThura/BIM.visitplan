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

  const monthStartISO = toISO(year, month, 1);
  const monthEndISO   = toISO(year, month, new Date(year, month + 1, 0).getDate());

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const filter: Record<string, string> = {
        'date[$gte]': monthStartISO,
        'date[$lte]': monthEndISO,
      };
      let data: CockpitVisit[];
      if (user.role === 'am' || user.role === 'sales' || user.role === 'solution') {
        const all = await getVisitsByAm(user._id, { limit: 200 });
        data = all.filter(v => v.date != null && v.date >= monthStartISO && v.date <= monthEndISO);
      } else {
        data = await getVisits({ filter, limit: 300, sort: { date: 1, start_time: 1 } });
      }
      setVisits(data);
      setError(null);
    } catch {
      setError('Could not load visits.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user._id, user.role, monthStartISO, monthEndISO]);

  useEffect(() => { load(); }, [load]);

  const grid = useMemo(() => buildGrid(year, month), [year, month]);
  const hasVisitSet = useMemo(() => {
    const s = new Set<string>();
    for (const v of visits) if (v.date) s.add(v.date);
    return s;
  }, [visits]);

  const dayVisits = useMemo(
    () => visits.filter(v => v.date === selected)
                .sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? '')),
    [visits, selected],
  );

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
        contentContainerStyle={{ paddingBottom: 140, paddingTop: 12 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.primary} />
        }
      >
        {/* Calendar card */}
        <View style={{ paddingHorizontal: 16 }}>
          <Card>
            {/* header */}
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
                      backgroundColor: isSelected ? theme.primary
                        : isToday ? theme.primaryLight
                        : 'transparent',
                      borderWidth: isToday && !isSelected ? 1 : 0,
                      borderColor: theme.primary,
                    }}>
                      <Text style={{
                        fontSize: 13,
                        fontWeight: isSelected || isToday ? '700' : '500',
                        color: isSelected ? '#fff'
                          : c.otherMonth ? theme.textFaint
                          : isToday ? theme.primary
                          : theme.text,
                      }}>
                        {c.day}
                      </Text>
                    </View>
                    {hasVisit && !isSelected ? (
                      <View style={{
                        width: 4, height: 4, borderRadius: 2,
                        backgroundColor: isToday ? theme.primary : theme.accent,
                        position: 'absolute', bottom: 4,
                      }} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </Card>
        </View>

        {/* Selected day section */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 20, marginTop: 22, marginBottom: 8,
        }}>
          <Text style={{
            fontSize: 14, fontWeight: '700', color: theme.text,
            fontFamily: fonts.display,
          }}>
            {selectedLabel}
          </Text>
          <Badge tone="muted">
            {dayVisits.length} visit{dayVisits.length !== 1 ? 's' : ''}
          </Badge>
        </View>

        {error ? (
          <View style={{ paddingHorizontal: 16, marginTop: 4 }}>
            <Card><Text style={{ color: theme.error, fontSize: 13 }}>{error}</Text></Card>
          </View>
        ) : null}

        <View style={{ paddingHorizontal: 16 }}>
          {dayVisits.length === 0 ? (
            <Card>
              <Text style={{
                fontSize: 14, color: theme.textSecondary,
                textAlign: 'center', paddingVertical: 16,
              }}>
                No visits scheduled for this day.
              </Text>
            </Card>
          ) : (
            <Card padded={false}>
              {dayVisits.map((v) => (
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
