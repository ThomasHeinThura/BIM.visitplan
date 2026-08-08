/**
 * The day rail — today's visits on a vertical time spine.
 *
 * This is the one place the app spends its boldness. Everywhere else is a list; here
 * the day has a shape. The spine encodes chronology, and the marker shows where the rep
 * currently sits in it — so "two done, one imminent, one late this afternoon" is
 * readable before any text is.
 *
 * Structural, not decorative: the rail exists because a field day IS a sequence, which
 * is the test for whether a device like this earns its place.
 */

import React from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '../../context/ThemeContext';
import type { VisitPlan } from '../../lib/crm/types';
import { Avatar, Rise, SectorChip, StatusPill } from '../../ui/Surface';
import { alpha, radius, sectorColor, space, type } from '../../ui/tokens';

const RAIL_X = 58;

function timeParts(iso: string) {
  const date = new Date(iso);

  // Meridiem split off so it can sit below the clock rather than wrapping the rail's
  // narrow gutter onto two ragged lines.
  const full = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const [clock, meridiem = ''] = full.split(' ');

  return { clock, meridiem, isPast: date.getTime() < Date.now() };
}

function VisitStop({
  visit,
  index,
  isLast,
  onPress,
}: {
  visit: VisitPlan;
  index: number;
  isLast: boolean;
  onPress?: () => void;
}) {
  const { theme } = useTheme();
  const { clock, meridiem, isPast } = timeParts(visit.scheduled_at);

  const status = visit.status.value;
  const overdue = isPast && status === 'planned';
  const sector = sectorColor(visit.sector?.color);

  // The node reads status at a glance: filled for done, ringed for still to come,
  // hollow for cancelled.
  const nodeFill =
    status === 'completed' ? theme.success
    : status === 'cancelled' ? theme.surfaceOffset
    : overdue ? theme.error
    : sector;

  return (
    <Rise index={index}>
      <View style={{ flexDirection: 'row', minHeight: 84 }}>
        <View style={{ width: RAIL_X, alignItems: 'flex-end', paddingRight: space.md, paddingTop: 1 }}>
          <Text
            style={[
              type.numeric,
              { color: overdue ? theme.error : isPast ? theme.textFaint : theme.text, fontSize: 14 },
            ]}
          >
            {clock}
          </Text>
          {meridiem ? (
            <Text style={[type.micro, { color: theme.textFaint, fontSize: 8.5 }]}>{meridiem}</Text>
          ) : null}
        </View>

        <View style={{ width: 22, alignItems: 'center' }}>
          <View
            style={{
              width: 13,
              height: 13,
              borderRadius: 7,
              backgroundColor: status === 'cancelled' ? 'transparent' : nodeFill,
              borderWidth: 2.5,
              borderColor: status === 'completed' ? theme.success : nodeFill,
              marginTop: 3,
            }}
          />
          {/* The connector stops at the last stop so the rail does not trail into
              nothing below the final visit. */}
          {!isLast ? (
            <View style={{ flex: 1, width: 2, backgroundColor: theme.divider, marginTop: 4 }} />
          ) : null}
        </View>

        <View style={{ flex: 1, paddingLeft: space.md, paddingBottom: space.lg }}>
          <View
            onTouchEnd={onPress}
            style={{
              backgroundColor: theme.surface,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: overdue ? alpha(theme.error, 0.45) : theme.border,
              padding: space.md,
              gap: 7,
            }}
          >
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
      </View>
    </Rise>
  );
}

export function DayRail({
  visits,
  onOpenVisit,
}: {
  visits: VisitPlan[];
  onOpenVisit?: (visit: VisitPlan) => void;
}) {
  const { theme } = useTheme();

  const now = new Date();
  const nowLabel = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  // The marker sits before the first visit still ahead. If the day is done it falls at
  // the end, which is itself the useful signal.
  const nextIndex = visits.findIndex((visit) => new Date(visit.scheduled_at).getTime() >= now.getTime());
  const markerAt = nextIndex === -1 ? visits.length : nextIndex;

  return (
    <View style={{ paddingHorizontal: space.lg }}>
      {visits.map((visit, index) => (
        <React.Fragment key={visit.id}>
          {index === markerAt ? <NowMarker label={nowLabel} /> : null}
          <VisitStop
            visit={visit}
            index={index}
            isLast={index === visits.length - 1 && markerAt !== visits.length}
            onPress={onOpenVisit ? () => onOpenVisit(visit) : undefined}
          />
        </React.Fragment>
      ))}

      {markerAt === visits.length ? <NowMarker label={nowLabel} trailing /> : null}
    </View>
  );
}

function NowMarker({ label, trailing = false }: { label: string; trailing?: boolean }) {
  const { theme } = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: trailing ? 0 : space.md }}>
      <View style={{ width: RAIL_X, alignItems: 'flex-end', paddingRight: space.md }}>
        <Text style={[type.micro, { color: theme.primary, letterSpacing: 0.4 }]}>{label}</Text>
      </View>

      <View style={{ width: 22, alignItems: 'center' }}>
        <View
          style={{
            width: 9,
            height: 9,
            borderRadius: 5,
            backgroundColor: theme.primary,
            shadowColor: theme.primary,
            shadowOpacity: 0.9,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 0 },
          }}
        />
      </View>

      <View style={{ flex: 1, paddingLeft: space.md, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: alpha(theme.primary, 0.45) }} />
        <Text style={[type.micro, { color: theme.primary, letterSpacing: 0.7 }]}>Now</Text>
      </View>
    </View>
  );
}
