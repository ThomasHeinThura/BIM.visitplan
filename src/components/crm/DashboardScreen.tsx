/**
 * The landing screen.
 *
 * Leads with what the day demands rather than a greeting: the headline is the number of
 * visits and whether anything is late, because that is the question a rep opens the app
 * to answer. Everything below it is the answer in detail.
 *
 * One /dashboard request — four round trips on a phone in a client's lobby is three too
 * many.
 */

import React from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { useTheme } from '../../context/ThemeContext';
import { getDashboard } from '../../lib/crm/clients';
import type { VisitPlan } from '../../lib/crm/types';
import { Gradient } from '../../ui/Gradient';
import { Card, Rise, SectionHeader, StatTile } from '../../ui/Surface';
import { alpha, radius, space, type } from '../../ui/tokens';
import { DayRail } from './DayRail';
import { EmptyState, ErrorState, LoadingState, NoAccessState } from './States';
import { listPendingTransfers } from '../../lib/crm/collaboration';
import { useResource } from './useResource';
import { VisitCard } from './VisitCard';

function greeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';

  return 'Good evening';
}

export function DashboardScreen({
  onOpenVisit,
  onSeeAllVisits,
  onOpenDeal,
}: {
  onOpenVisit?: (visit: VisitPlan) => void;
  onSeeAllVisits?: () => void;
  onOpenDeal?: (dealId: number) => void;
}) {
  const { theme, isDark } = useTheme();
  const { data, loading, error, refetch, refreshing } = useResource((signal) => getDashboard(signal));

  // Its own request rather than part of the dashboard payload: it returns an empty
  // list for anyone who cannot approve, so it costs a rep nothing and does not need a
  // permission check here to decide whether to ask.
  const approvals = useResource((signal) => listPendingTransfers(signal));

  if (loading) return <LoadingState label="Loading your day…" />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!data) return null;

  const counts = data.visit_counts;
  const firstName = data.user.name.split(' ')[0];

  // The headline states the day in one line. "Nothing scheduled" is a real answer, not
  // an empty string — a rep who reads it can stop checking.
  const headline =
    !data.can.view_visits ? 'Welcome back'
    : counts.today === 0 ? 'Nothing scheduled'
    : counts.today === 1 ? '1 visit today'
    : `${counts.today} visits today`;

  const subline =
    counts.overdue > 0
      ? `${counts.overdue} overdue ${counts.overdue === 1 ? 'visit needs' : 'visits need'} attention`
      : data.can.view_visits
        ? `${counts.planned} planned · ${counts.completed_this_month} done this month`
        : 'Your dashboard';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ paddingBottom: space.xxl }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor={theme.primary} />
      }
    >
      <Gradient
        colors={
          isDark
            ? [alpha(theme.primary, 0.28), alpha(theme.info, 0.14), theme.bg]
            : [alpha(theme.primary, 0.18), alpha(theme.info, 0.08), theme.bg]
        }
        direction={2}
        style={{ paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.xl }}
      >
        <Text style={[type.micro, { color: theme.primary }]}>
          {greeting()}, {firstName}
        </Text>

        <Text style={[type.hero, { color: theme.text, marginTop: space.sm }]}>{headline}</Text>

        <Text style={[type.body, { color: counts.overdue > 0 ? theme.error : theme.textSecondary, marginTop: 5 }]}>
          {subline}
        </Text>

        {/* textSecondary rather than textFaint: over the gradient, faint dropped below
            a readable contrast ratio. */}
        <Text style={[type.micro, { color: theme.textSecondary, marginTop: space.md, letterSpacing: 0.7 }]}>
          {new Date().toLocaleDateString(undefined, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </Text>
      </Gradient>

      {data.can.view_visits ? (
        <View style={{ flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, marginTop: -space.md }}>
          <StatTile value={counts.today} label="Today" tone="brand" />
          <StatTile value={counts.planned} label="Planned" />
          <StatTile
            value={counts.overdue}
            label="Overdue"
            // Coloured only when non-zero: a permanently red zero trains people to
            // ignore the colour.
            tone={counts.overdue > 0 ? 'warn' : 'neutral'}
          />
          <StatTile value={counts.completed_this_month} label="Done" tone="good" caption="this month" />
        </View>
      ) : null}

      {/* Someone is waiting on this person. It goes above the day's schedule because
          a transfer sitting unanswered blocks another rep from working the deal at
          all — which is more urgent than anything on the calendar. */}
      {(approvals.data ?? []).length > 0 ? (
        <>
          <SectionHeader eyebrow="Needs you" title="Transfers awaiting approval" />
          {(approvals.data ?? []).map((transfer, index) => (
            <Rise key={transfer.id} index={index}>
              <View style={{ paddingHorizontal: space.lg, paddingBottom: space.md }}>
                <Card
                  level={1}
                  accent="#F59E0B"
                  onPress={onOpenDeal ? () => onOpenDeal(transfer.deal_id) : undefined}
                >
                  <Text style={[type.heading, { color: theme.text }]}>
                    {transfer.deal_title ?? 'A deal'}
                  </Text>
                  <Text style={[type.bodySm, { color: theme.textSecondary, marginTop: 4 }]}>
                    {transfer.requested_by?.name} wants to move it from{' '}
                    {transfer.from_user?.name} to {transfer.to_user?.name}.
                  </Text>
                  {transfer.reason ? (
                    <Text style={[type.micro, { color: theme.textSecondary, marginTop: 4 }]}>
                      “{transfer.reason}”
                    </Text>
                  ) : null}
                </Card>
              </View>
            </Rise>
          ))}
        </>
      ) : null}

      <SectionHeader
        eyebrow="Your day"
        title="Today's schedule"
        action={data.can.view_visits ? 'All visits' : undefined}
        onAction={onSeeAllVisits}
      />

      {!data.can.view_visits ? (
        <NoAccessState what="visit plans" />
      ) : data.todays_visits.length === 0 ? (
        <View style={{ paddingHorizontal: space.lg }}>
          <Card level={1}>
            <EmptyState
              icon="◷"
              title="No visits today"
              message="Nothing is booked. Check what's coming up below, or plan a visit."
            />
          </Card>
        </View>
      ) : (
        <DayRail visits={data.todays_visits} onOpenVisit={onOpenVisit} />
      )}

      {data.can.view_visits && data.upcoming_visits.length > 0 ? (
        <>
          <SectionHeader eyebrow="Ahead" title="Coming up" />
          {data.upcoming_visits.map((visit, index) => (
            <Rise key={visit.id} index={index}>
              <VisitCard visit={visit} onPress={onOpenVisit ? () => onOpenVisit(visit) : undefined} />
            </Rise>
          ))}
        </>
      ) : null}

      {data.can.view_clients ? (
        <View style={{ paddingHorizontal: space.lg, marginTop: space.xl }}>
          <Card level={1} padded={false}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: space.lg,
              }}
            >
              <View style={{ gap: 3 }}>
                <Text style={[type.micro, { color: theme.textFaint }]}>In your territory</Text>
                <Text style={[type.title, { color: theme.text }]}>
                  {data.client_count} {data.client_count === 1 ? 'client' : 'clients'}
                </Text>
              </View>

              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: radius.md,
                  backgroundColor: alpha(theme.primary, 0.14),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 17, color: theme.primary }}>◇</Text>
              </View>
            </View>
          </Card>
        </View>
      ) : null}
    </ScrollView>
  );
}
