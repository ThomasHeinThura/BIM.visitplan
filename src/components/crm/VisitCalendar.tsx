/**
 * Month view for visits.
 *
 * Answers "how busy am I, and when" before it answers "what exactly". Each day cell
 * carries a count and a row of sector dots, so the shape of a month — which weeks are
 * loaded, which sectors dominate, where the gaps are — is readable without opening
 * anything.
 *
 * The month's visits are fetched in ONE request bounded by from/to, not a request per
 * day. Tapping a day filters the list below from data already in hand, so moving around
 * the month costs nothing.
 */

import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '../../context/ThemeContext';
import type { VisitPlan } from '../../lib/crm/types';
import { alpha, radius, sectorColor, space, type } from '../../ui/tokens';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export type MonthRange = { from: string; to: string };

/** Local-time month bounds. Building these from UTC shifts the grid by a day east of GMT. */
export function monthRange(anchor: Date): MonthRange {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 0, 0, 0);
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59);

  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  return { from: `${iso(first)} 00:00:00`, to: `${iso(last)} 23:59:59` };
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

type Cell = { date: Date; inMonth: boolean };

/**
 * Six weeks of cells, Monday-first, padded from the previous and next month so the grid
 * is always rectangular — a ragged grid makes the month hard to read at a glance.
 */
function buildGrid(anchor: Date): Cell[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);

  // getDay() is Sunday-based; shift so Monday is 0.
  const leading = (first.getDay() + 6) % 7;

  const start = new Date(first);
  start.setDate(first.getDate() - leading);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);

    return { date, inMonth: date.getMonth() === anchor.getMonth() };
  });
}

export function VisitCalendar({
  anchor,
  visits,
  selectedKey,
  onSelectDay,
  onChangeMonth,
}: {
  anchor: Date;
  visits: VisitPlan[];
  selectedKey: string | null;
  onSelectDay: (key: string | null) => void;
  onChangeMonth: (next: Date) => void;
}) {
  const { theme } = useTheme();

  const cells = useMemo(() => buildGrid(anchor), [anchor]);

  // Bucket once per data change rather than scanning the list inside all 42 cells.
  const byDay = useMemo(() => {
    const map = new Map<string, VisitPlan[]>();

    visits.forEach((visit) => {
      const key = dayKey(new Date(visit.scheduled_at));
      const bucket = map.get(key);

      if (bucket) bucket.push(visit);
      else map.set(key, [visit]);
    });

    return map;
  }, [visits]);

  const todayKey = dayKey(new Date());

  const monthLabel = anchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const step = (delta: number) => {
    const next = new Date(anchor.getFullYear(), anchor.getMonth() + delta, 1);
    onSelectDay(null);
    onChangeMonth(next);
  };

  return (
    <View
      style={{
        marginHorizontal: space.lg,
        backgroundColor: theme.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: theme.border,
        padding: space.md,
        gap: space.md,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Pressable onPress={() => step(-1)} hitSlop={12} style={{ padding: 4 }}>
          <Text style={{ fontSize: 18, color: theme.primary }}>‹</Text>
        </Pressable>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[type.heading, { color: theme.text }]}>{monthLabel}</Text>
          <Text style={[type.micro, { color: theme.textFaint }]}>
            {visits.length} {visits.length === 1 ? 'visit' : 'visits'}
          </Text>
        </View>

        <Pressable onPress={() => step(1)} hitSlop={12} style={{ padding: 4 }}>
          <Text style={{ fontSize: 18, color: theme.primary }}>›</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row' }}>
        {WEEKDAYS.map((label, index) => (
          <View key={`${label}${index}`} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[type.micro, { color: theme.textFaint, fontSize: 9.5 }]}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((cell) => {
          const key = dayKey(cell.date);
          const dayVisits = byDay.get(key) ?? [];
          const isToday = key === todayKey;
          const isSelected = key === selectedKey;

          // Up to three sector dots — enough to show the mix, few enough to fit a cell.
          const dots = dayVisits.slice(0, 3).map((visit) => sectorColor(visit.sector?.color));

          return (
            <Pressable
              key={key}
              onPress={() => onSelectDay(isSelected ? null : key)}
              // Six rows of seven: 100/7 keeps the grid exact without measuring.
              style={{ width: `${100 / 7}%`, aspectRatio: 0.92, padding: 2 }}
            >
              <View
                style={{
                  flex: 1,
                  borderRadius: radius.sm,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                  backgroundColor: isSelected
                    ? theme.primary
                    : dayVisits.length > 0
                      ? alpha(theme.primary, 0.1)
                      : 'transparent',
                  borderWidth: isToday && !isSelected ? 1.5 : 0,
                  borderColor: theme.primary,
                }}
              >
                <Text
                  style={[
                    type.bodySm,
                    {
                      fontSize: 12.5,
                      fontWeight: isToday || dayVisits.length > 0 ? '700' : '500',
                      color: isSelected
                        ? '#fff'
                        : !cell.inMonth
                          ? theme.textFaint
                          : dayVisits.length > 0
                            ? theme.text
                            : theme.textSecondary,
                    },
                  ]}
                >
                  {cell.date.getDate()}
                </Text>

                <View style={{ flexDirection: 'row', gap: 2, height: 4 }}>
                  {dots.map((color, index) => (
                    <View
                      key={index}
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: isSelected ? '#fff' : color,
                      }}
                    />
                  ))}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export { dayKey };
