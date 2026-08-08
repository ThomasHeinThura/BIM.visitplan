/**
 * The landing screen.
 *
 * Answers one question — what am I doing today — and gets everything it needs from a
 * single /dashboard request, because four round trips on a phone at a client site is
 * three too many.
 */

import React from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { fonts, useTheme } from '../../context/ThemeContext';
import { getDashboard } from '../../lib/crm/clients';
import type { VisitPlan } from '../../lib/crm/types';
import { KPICard, SectionHead } from '../ui';
import { EmptyState, ErrorState, LoadingState, NoAccessState } from './States';
import { useResource } from './useResource';
import { VisitCard } from './VisitCard';

export function DashboardScreen({
  onOpenVisit,
  onSeeAllVisits,
}: {
  onOpenVisit?: (visit: VisitPlan) => void;
  onSeeAllVisits?: () => void;
}) {
  const { theme } = useTheme();
  const { data, loading, error, refetch, refreshing } = useResource((signal) => getDashboard(signal));

  if (loading) return <LoadingState label="Loading your day…" />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!data) return null;

  const counts = data.visit_counts;
  const firstName = data.user.name.split(' ')[0];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor={theme.primary} />
      }
    >
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: theme.text, fontFamily: fonts.display }}>
          Hello, {firstName}
        </Text>
        <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 2 }}>
          {new Date().toLocaleDateString(undefined, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </Text>
      </View>

      {data.can.view_visits ? (
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 12 }}>
          <KPICard value={counts.today} label="Today" />
          <KPICard value={counts.planned} label="Planned" />
          <KPICard
            value={counts.overdue}
            label="Overdue"
            // Only coloured when it is non-zero: a red 0 trains people to ignore red.
            accent={counts.overdue > 0 ? theme.error : undefined}
          />
          <KPICard value={counts.completed_this_month} label="Done this month" />
        </View>
      ) : null}

      <SectionHead
        title="Today's visits"
        action={data.can.view_visits ? 'See all' : undefined}
        onAction={onSeeAllVisits}
      />

      {!data.can.view_visits ? (
        <NoAccessState what="visit plans" />
      ) : data.todays_visits.length === 0 ? (
        <EmptyState
          icon="◷"
          title="Nothing scheduled today"
          message="No visits are booked for today. Check the upcoming list, or plan a new visit."
        />
      ) : (
        data.todays_visits.map((visit) => (
          <VisitCard
            key={visit.id}
            visit={visit}
            showDay={false}
            onPress={onOpenVisit ? () => onOpenVisit(visit) : undefined}
          />
        ))
      )}

      {data.can.view_visits && data.upcoming_visits.length > 0 ? (
        <>
          <SectionHead title="Coming up" />
          {data.upcoming_visits.map((visit) => (
            <VisitCard
              key={visit.id}
              visit={visit}
              onPress={onOpenVisit ? () => onOpenVisit(visit) : undefined}
            />
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}
