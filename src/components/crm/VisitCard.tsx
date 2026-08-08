/**
 * One visit in a list.
 *
 * Shared by the visit list, the client workspace and the dashboard's "coming up", so a
 * visit looks the same wherever it appears. The dashboard's *today* section uses the
 * day rail instead — that is the one place a visit gets special treatment.
 */

import React from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '../../context/ThemeContext';
import type { VisitPlan } from '../../lib/crm/types';
import { Avatar, Card, SectorChip, StatusPill } from '../../ui/Surface';
import { alpha, radius, sectorColor, space, type } from '../../ui/tokens';

function when(iso: string) {
  const date = new Date(iso);
  const now = new Date();

  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  // Split the meridiem off rather than letting "10:45 AM" wrap inside the date block —
  // as one string it broke across three lines at this width.
  const full = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const [clock, meridiem = ''] = full.split(' ');

  return {
    clock,
    meridiem,
    day: sameDay ? 'Today' : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
    weekday: sameDay ? '' : date.toLocaleDateString(undefined, { weekday: 'short' }),
    isPast: date.getTime() < now.getTime(),
  };
}

export function VisitCard({ visit, onPress }: { visit: VisitPlan; onPress?: () => void }) {
  const { theme } = useTheme();
  const { clock, meridiem, day, weekday, isPast } = when(visit.scheduled_at);

  const status = visit.status.value;
  const overdue = isPast && status === 'planned';
  const sector = sectorColor(visit.sector?.color);

  return (
    <Card
      onPress={onPress}
      accent={visit.sector?.color ?? null}
      style={{ marginHorizontal: space.lg, marginBottom: space.md }}
    >
      <View style={{ flexDirection: 'row', gap: space.md }}>
        {/* The date block is the anchor: a rep scans a list by time first. */}
        <View
          style={{
            width: 60,
            borderRadius: radius.md,
            backgroundColor: overdue ? alpha(theme.error, 0.12) : alpha(sector, 0.12),
            borderWidth: 1,
            borderColor: overdue ? alpha(theme.error, 0.3) : alpha(sector, 0.25),
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: space.sm,
            gap: 1,
          }}
        >
          {weekday ? (
            <Text style={[type.micro, { color: theme.textFaint, fontSize: 9, letterSpacing: 0.5 }]}>
              {weekday}
            </Text>
          ) : null}

          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
            <Text style={[type.numeric, { color: overdue ? theme.error : sector, fontSize: 15 }]}>
              {clock}
            </Text>
            {meridiem ? (
              <Text style={[type.micro, { color: overdue ? theme.error : sector, fontSize: 8.5 }]}>
                {meridiem}
              </Text>
            ) : null}
          </View>

          <Text style={[type.micro, { color: theme.textFaint, fontSize: 9, letterSpacing: 0.3 }]}>{day}</Text>
        </View>

        <View style={{ flex: 1, gap: 7 }}>
          <Text style={[type.heading, { color: theme.text }]} numberOfLines={2}>
            {visit.title}
          </Text>

          {visit.client ? (
            <Text style={[type.bodySm, { color: theme.textSecondary }]} numberOfLines={1}>
              {visit.client.name}
            </Text>
          ) : null}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {overdue ? (
              <StatusPill label="Overdue" tone="overdue" />
            ) : (
              <StatusPill
                label={visit.status.label}
                tone={status === 'completed' ? 'done' : status === 'cancelled' ? 'cancelled' : 'planned'}
              />
            )}

            {visit.sector ? <SectorChip name={visit.sector.name} color={visit.sector.color} /> : null}

            <View style={{ flex: 1 }} />

            {visit.owner ? <Avatar name={visit.owner.name} size={24} color={visit.sector?.color} /> : null}
          </View>
        </View>
      </View>
    </Card>
  );
}
