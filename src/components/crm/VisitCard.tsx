/**
 * One visit, as it appears in a list.
 *
 * Shared by the dashboard, the visit list and the client workspace so a visit looks
 * and behaves identically wherever it turns up.
 */

import React from 'react';
import { Text, View } from 'react-native';

import { fonts, radii, useTheme } from '../../context/ThemeContext';
import type { VisitPlan, VisitStatusValue } from '../../lib/crm/types';
import { Badge, Card } from '../ui';

/**
 * Status wording comes from the server; only the colour is decided here. Mapping the
 * enum value — not the label — means renaming a status server-side changes the text
 * everywhere without silently falling back to a default tone.
 */
const TONE_BY_STATUS: Record<VisitStatusValue, 'teal' | 'success' | 'muted'> = {
  planned: 'teal',
  completed: 'success',
  cancelled: 'muted',
};

function formatWhen(iso: string): { day: string; time: string; isPast: boolean } {
  const date = new Date(iso);
  const now = new Date();

  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  if (sameDay) return { day: 'Today', time, isPast: date < now };

  const day = date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return { day, time, isPast: date < now };
}

export function VisitCard({
  visit,
  onPress,
  showDay = true,
}: {
  visit: VisitPlan;
  onPress?: () => void;
  showDay?: boolean;
}) {
  const { theme } = useTheme();
  const { day, time, isPast } = formatWhen(visit.scheduled_at);

  // A planned visit whose date has passed is the thing a rep most often loses track
  // of, so it is called out rather than left looking like any other row.
  const isOverdue = isPast && visit.status.value === 'planned';

  return (
    <Card onPress={onPress} style={{ marginHorizontal: 16, marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View
          style={{
            width: 52,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isOverdue ? theme.errorLight : theme.primaryLight,
            borderRadius: radii.md,
            paddingVertical: 8,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              color: isOverdue ? theme.error : theme.primary,
              fontFamily: fonts.display,
            }}
          >
            {time}
          </Text>
          {showDay ? (
            <Text style={{ fontSize: 9, color: theme.textSecondary, marginTop: 2 }}>{day}</Text>
          ) : null}
        </View>

        <View style={{ flex: 1, gap: 4 }}>
          <Text
            numberOfLines={1}
            style={{ fontSize: 14, fontWeight: '600', color: theme.text, fontFamily: fonts.display }}
          >
            {visit.title}
          </Text>

          {visit.client ? (
            <Text numberOfLines={1} style={{ fontSize: 12, color: theme.textSecondary }}>
              {visit.client.name}
            </Text>
          ) : null}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Badge tone={TONE_BY_STATUS[visit.status.value]}>{visit.status.label}</Badge>

            {isOverdue ? <Badge tone="error">Overdue</Badge> : null}

            {visit.sector ? <Badge tone="muted">{visit.sector.name}</Badge> : null}
          </View>

          {/* Only meaningful to someone who can see other people's visits; for an
              account manager every row is their own, so it would be noise. */}
          {visit.owner ? (
            <Text style={{ fontSize: 11, color: theme.textFaint }}>{visit.owner.name}</Text>
          ) : null}
        </View>
      </View>
    </Card>
  );
}
