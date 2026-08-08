/**
 * One deal, in full.
 *
 * Until now a tap on a deal card opened the edit form, which meant the only way to
 * look at a deal was to start changing it — and a rep without update rights had no way
 * to open one at all. This is the read view, with Edit as an action on it.
 *
 * It is also where the team lives, because "who else can see this" is a property of the
 * deal rather than a screen of its own.
 */

import React from 'react';
import { RefreshControl, ScrollView, Pressable, Text, View } from 'react-native';

import { useTheme } from '../../context/ThemeContext';
import { listCollaborators, listTransfers, getExchangeRate } from '../../lib/crm/collaboration';
import { getDeal } from '../../lib/crm/deals';
import { convertToMmk, formatDealValue } from '../../lib/crm/money';
import { alpha, radius, sectorColor, space, type } from '../../ui/tokens';
import { DealTeamPanel } from './DealTeamPanel';
import { ErrorState, LoadingState, NoAccessState } from './States';
import { useResource } from './useResource';

function formatDay(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function DealDetailScreen({
  dealId,
  onEdit,
}: {
  dealId: number;
  onEdit: (deal: import('../../lib/crm/types').Deal) => void;
}) {
  const { theme } = useTheme();

  // One request per resource rather than one combined call: the deal is the only part
  // that must succeed for the screen to be worth showing, and a rate that fails to
  // load should cost the kyat line, not the page.
  const dealState = useResource((signal) => getDeal(dealId, signal), [dealId]);
  const collaborators = useResource((signal) => listCollaborators(dealId, signal), [dealId]);
  const transfers = useResource((signal) => listTransfers(dealId, signal), [dealId]);
  const rate = useResource((signal) => getExchangeRate(signal), []);

  const refetchAll = () => {
    dealState.refetch();
    collaborators.refetch();
    transfers.refetch();
  };

  if (dealState.loading && !dealState.data) return <LoadingState label="Loading deal…" />;
  if (dealState.forbidden) return <NoAccessState what="this deal" />;
  if (dealState.error) return <ErrorState message={dealState.error} onRetry={dealState.refetch} />;

  const deal = dealState.data;
  if (!deal) return <ErrorState message="Deal not found." onRetry={dealState.refetch} />;

  const tint = sectorColor(deal.sector?.color);
  const mmk = convertToMmk(deal, rate.data?.data?.rate ?? null);

  return (
    <ScrollView
      contentContainerStyle={{ padding: space.lg, gap: space.xl, paddingBottom: space.xxl * 2 }}
      refreshControl={
        <RefreshControl refreshing={dealState.refreshing} onRefresh={refetchAll} />
      }
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View
        style={{
          backgroundColor: theme.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: theme.border,
          // The sector's colour on the leading edge — the same language the lists and
          // the calendar use, so a Banking deal reads as Banking without being labelled.
          borderLeftWidth: 4,
          borderLeftColor: tint,
          padding: space.lg,
          gap: space.sm,
        }}
      >
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          {deal.stage ? <Chip label={deal.stage.name} tint={sectorColor(deal.stage.color)} /> : null}
          {deal.sector ? <Chip label={deal.sector.name} tint={tint} /> : null}
          {/* Why a deal they did not create is in their list. */}
          {deal.is_collaborator ? <Chip label="Shared with you" tint={theme.textSecondary} /> : null}
          {deal.is_paused ? <Chip label="Paused" tint={theme.textSecondary} /> : null}
        </View>

        <Text style={[type.title, { color: theme.text }]}>{deal.title}</Text>

        {deal.client ? (
          <Text style={[type.body, { color: theme.textSecondary }]}>{deal.client.name}</Text>
        ) : null}

        <Text style={[type.display, { color: theme.text, marginTop: space.sm }]}>
          {formatDealValue(deal)}
        </Text>

        {/* Only for USD deals, and only when a rate has been filed. Showing a kyat
            figure derived from no rate would be a dollar figure wearing a K. */}
        {mmk ? (
          <Text style={[type.micro, { color: theme.textSecondary }]}>
            ≈ {mmk} at the official rate
            {rate.data?.data?.is_stale ? ' (more than a week old)' : ''}
          </Text>
        ) : null}
      </View>

      {/* ── Facts ─────────────────────────────────────────────────────────── */}
      <View style={{ gap: space.sm }}>
        <Row label="Owner" value={deal.owner?.name ?? 'Unassigned'} />
        <Row label="Contact" value={deal.contact?.name ?? '—'} />
        <Row label="Ends" value={formatDay(deal.ended_at)} />
        <Row label="Updated" value={formatDay(deal.updated_at)} />
      </View>

      {deal.notes ? (
        <View style={{ gap: space.sm }}>
          <Text style={[type.micro, { color: theme.textSecondary, letterSpacing: 1.2 }]}>
            NOTES
          </Text>
          <View
            style={{
              backgroundColor: theme.surface,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: theme.border,
              padding: space.md,
            }}
          >
            <Text style={[type.body, { color: theme.textSecondary }]}>{deal.notes}</Text>
          </View>
        </View>
      ) : null}

      {deal.can.update ? (
        <Pressable
          onPress={() => onEdit(deal)}
          style={{
            alignItems: 'center',
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: theme.primary,
            paddingVertical: space.md,
          }}
        >
          <Text style={[type.body, { color: theme.primary, fontWeight: '700' }]}>
            Edit deal
          </Text>
        </Pressable>
      ) : null}

      <DealTeamPanel
        collaborators={collaborators.data ?? []}
        deal={deal}
        transfers={transfers.data ?? []}
        onChanged={refetchAll}
      />
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: space.md,
      }}
    >
      <Text style={[type.body, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[type.body, { color: theme.text, fontWeight: '600', flexShrink: 1 }]}>
        {value}
      </Text>
    </View>
  );
}

function Chip({ label, tint }: { label: string; tint: string }) {
  return (
    <View
      style={{
        paddingHorizontal: space.md,
        paddingVertical: 3,
        borderRadius: radius.pill,
        backgroundColor: alpha(tint, 0.14),
      }}
    >
      <Text style={[type.micro, { color: tint, fontWeight: '700' }]}>{label}</Text>
    </View>
  );
}
