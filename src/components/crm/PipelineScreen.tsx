/**
 * The pipeline board.
 *
 * Columns scroll horizontally, one per stage, each showing its deals. Every stage is
 * rendered even when empty — a missing column is worse than an empty one, because a
 * deal moved into it appears to vanish.
 *
 * Moving a card is a tap, not a drag: drag-and-drop across a horizontally scrolling
 * container on a phone is fiddly and easy to trigger by accident. Tapping a deal opens
 * a stage picker, which is slower per move but never moves the wrong card.
 */

import React, { useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { useTheme } from '../../context/ThemeContext';
import { getPipeline, moveDealStage } from '../../lib/crm/deals';
import type { Deal, PipelineColumn, StageTypeValue } from '../../lib/crm/types';
import { Avatar, ProportionBar, Rise, StatusPill } from '../../ui/Surface';
import { alpha, radius, sectorColor, space, type } from '../../ui/tokens';
import { EmptyState, ErrorState, LoadingState, NoAccessState } from './States';
import { useResource } from './useResource';

const COLUMN_WIDTH = 268;

/** Colour by stage TYPE, so a renamed stage keeps its meaning. */
function stageTone(stage: StageTypeValue) {
  switch (stage) {
    case 'won':
      return 'won' as const;
    case 'lost':
      return 'lost' as const;
    case 'progress':
      return 'progress' as const;
    default:
      return 'lead' as const;
  }
}

function stageColor(stage: StageTypeValue, theme: ReturnType<typeof useTheme>['theme']): string {
  switch (stage) {
    case 'won':
      return theme.success;
    case 'lost':
      return theme.error;
    case 'progress':
      return theme.info;
    case 'custom':
      return theme.purple;
    default:
      return theme.primary;
  }
}

function compact(amount: number): string {
  // Compact so a column header stays readable at 268pt.
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${Math.round(amount / 1_000)}K`;

  return amount.toFixed(0);
}

/**
 * A column's money, one line per currency.
 *
 * Kyat and dollars are never added together — the sum would be neither, and at
 * roughly 4,500 kyat to the dollar a single MMK deal would swamp the column and make
 * every USD deal in it look like a rounding error.
 */
function formatTotals(totals: Record<string, string>): string | null {
  const parts = Object.entries(totals)
    .map(([currency, value]) => [currency, Number(value)] as const)
    .filter(([, amount]) => Number.isFinite(amount) && amount > 0)
    .map(([currency, amount]) => `${CURRENCY_SYMBOL[currency] ?? ''}${compact(amount)}`);

  return parts.length === 0 ? null : parts.join(' · ');
}

const CURRENCY_SYMBOL: Record<string, string> = { USD: '$', MMK: 'K ' };

/**
 * The figure the proportion bar is drawn from.
 *
 * Deliberately USD only. The bar answers "where does the money sit", and mixing two
 * currencies into one length would make a kyat-heavy column appear to hold the entire
 * pipeline. A column that is entirely MMK gets no bar rather than a misleading one.
 */
function usdAmount(totals: Record<string, string>): number {
  return Number(totals.USD ?? 0) || 0;
}

function DealCard({ deal, index, onPress }: { deal: Deal; index: number; onPress: () => void }) {
  const { theme } = useTheme();
  // The card carries its own currency symbol. Two cards in one column can now be in
  // different currencies, and a bare "2000" beside a bare "2000000" says nothing about
  // which is the bigger opportunity.
  const amount = deal.value === null ? null : Number(deal.value);
  const value =
    amount !== null && Number.isFinite(amount) && amount !== 0
      ? `${CURRENCY_SYMBOL[deal.currency] ?? ''}${compact(amount)}`
      : null;
  const sector = sectorColor(deal.sector?.color);

  return (
    <Rise index={index}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          {
            backgroundColor: theme.surface,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: theme.border,
            marginBottom: space.sm,
            overflow: 'hidden',
            flexDirection: 'row',
          },
          pressed && { transform: [{ scale: 0.98 }], borderColor: alpha(theme.primary, 0.45) },
        ]}
      >
        <View style={{ width: 3, backgroundColor: sector }} />

        <View style={{ flex: 1, padding: space.md, gap: 7 }}>
          <Text numberOfLines={2} style={[type.heading, { color: theme.text, fontSize: 13.5 }]}>
            {deal.title}
          </Text>

          {deal.client ? (
            <Text numberOfLines={1} style={[type.bodySm, { color: theme.textSecondary, fontSize: 11.5 }]}>
              {deal.client.name}
            </Text>
          ) : null}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {value ? (
              <Text style={[type.numeric, { color: theme.text, fontSize: 15 }]}>{value}</Text>
            ) : (
              <Text style={[type.micro, { color: theme.textFaint }]}>No value</Text>
            )}

            <View style={{ flex: 1 }} />

            {deal.owner ? <Avatar name={deal.owner.name} size={22} color={deal.sector?.color} /> : null}
          </View>
        </View>
      </Pressable>
    </Rise>
  );
}

function Column({
  column,
  pipelineTotal,
  onOpenDeal,
}: {
  column: PipelineColumn;
  pipelineTotal: number;
  onOpenDeal: (deal: Deal) => void;
}) {
  const { theme } = useTheme();

  const total = formatTotals(column.totals);
  const amount = usdAmount(column.totals);

  // Share of the whole pipeline's value. This is the column header's real job — where
  // the money actually sits, not just how many cards are stacked up.
  const share = pipelineTotal > 0 ? amount / pipelineTotal : 0;
  const accent = stageColor(column.type, theme);

  return (
    <View
      style={{
        width: COLUMN_WIDTH,
        backgroundColor: theme.surfaceAlt,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: theme.border,
        padding: space.md,
        marginRight: space.md,
      }}
    >
      <View style={{ gap: space.sm, marginBottom: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Text numberOfLines={1} style={[type.heading, { flex: 1, color: theme.text }]}>
            {column.name}
          </Text>
          <StatusPill label={String(column.deal_count)} tone={stageTone(column.type)} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
          <Text style={[type.title, { color: total ? theme.text : theme.textFaint, fontSize: 17 }]}>
            {total ?? '—'}
          </Text>
          {share > 0 ? (
            <Text style={[type.micro, { color: theme.textFaint }]}>{Math.round(share * 100)}% of pipeline</Text>
          ) : null}
        </View>

        <ProportionBar fraction={share} color={accent} />
      </View>

      {column.deals.length === 0 ? (
        <View
          style={{
            paddingVertical: 26,
            alignItems: 'center',
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: theme.border,
            borderRadius: radius.md,
          }}
        >
          <Text style={[type.micro, { color: theme.textFaint }]}>Empty</Text>
        </View>
      ) : (
        column.deals.map((deal, index) => (
          <DealCard key={deal.id} deal={deal} index={index} onPress={() => onOpenDeal(deal)} />
        ))
      )}
    </View>
  );
}

export function PipelineScreen({ onEditDeal }: { onEditDeal?: (deal: Deal) => void }) {
  const { theme } = useTheme();
  const [selected, setSelected] = useState<Deal | null>(null);
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  const { data, loading, error, forbidden, refetch, refreshing } = useResource((signal) =>
    getPipeline(undefined, signal),
  );

  const move = async (stageId: number) => {
    if (!selected) return;

    setMoving(true);
    setMoveError(null);

    try {
      await moveDealStage(selected.id, stageId);
      setSelected(null);
      refetch();
    } catch (e) {
      // Surfaced in the sheet rather than as a toast: the server's message names the
      // reason (a foreign stage, for instance) and the user is still looking at the
      // control that caused it.
      setMoveError(e instanceof Error ? e.message : 'Could not move the deal.');
    } finally {
      setMoving(false);
    }
  };

  if (forbidden) return <NoAccessState what="deals" />;
  if (loading) return <LoadingState label="Loading pipeline…" />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!data) return null;

  // Totals are derived from the columns the server already scoped, so they can never
  // imply deals the viewer cannot open.
  const pipelineTotal = data.stages.reduce((sum, stage) => sum + usdAmount(stage.totals), 0);
  const pipelineMmk = data.stages.reduce((sum, stage) => sum + (Number(stage.totals.MMK ?? 0) || 0), 0);
  const dealCount = data.stages.reduce((sum, stage) => sum + stage.deal_count, 0);

  if (!data.sector || data.stages.length === 0) {
    return (
      <EmptyState
        icon="▦"
        title="No pipeline yet"
        message="No sector has pipeline stages configured. An administrator sets these up in the CRM."
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.md, gap: 4 }}>
        <Text style={[type.micro, { color: theme.primary }]}>Pipeline</Text>

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <Text style={[type.display, { color: theme.text }]}>{data.sector.name}</Text>

          {/* The pipeline's headline number. Without it the board shows distribution
              but never says how much is actually in play. */}
          {pipelineTotal > 0 || pipelineMmk > 0 ? (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[type.micro, { color: theme.textFaint }]}>Total</Text>
              <Text style={[type.title, { color: theme.primary }]}>
                ${compact(pipelineTotal)}
              </Text>
              {/* Shown separately, never folded in. */}
              {pipelineMmk > 0 ? (
                <Text style={[type.micro, { color: theme.textFaint }]}>
                  + K {compact(pipelineMmk)}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>

        <Text style={[type.bodySm, { color: theme.textSecondary }]}>
          {dealCount} {dealCount === 1 ? 'deal' : 'deals'} across {data.stages.length} stages
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // alignItems: 'flex-start' stops columns stretching to the scroll view's full
        // height — without it a three-card column reserves the whole screen and the
        // board reads as mostly empty.
        contentContainerStyle={{
          paddingHorizontal: space.lg,
          paddingBottom: space.xl,
          alignItems: 'flex-start',
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor={theme.primary} />
        }
      >
        {data.stages.map((column) => (
          <Column
            key={column.id}
            column={column}
            pipelineTotal={pipelineTotal}
            onOpenDeal={setSelected}
          />
        ))}
      </ScrollView>

      <Modal
        visible={selected !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <Pressable
          onPress={() => setSelected(null)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
        >
          {/* Stops a tap inside the sheet from closing it via the backdrop handler. */}
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: theme.surface,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              padding: 20,
              paddingBottom: 34,
              gap: 12,
            }}
          >
            <Text style={[type.title, { color: theme.text }]}>
              {selected?.title}
            </Text>

            {selected?.client ? (
              <Text style={{ fontSize: 13, color: theme.textSecondary }}>{selected.client.name}</Text>
            ) : null}

            {moveError ? (
              <View style={{ backgroundColor: theme.errorLight, borderRadius: radius.md, padding: 10 }}>
                <Text style={{ color: theme.error, fontSize: 12 }}>{moveError}</Text>
              </View>
            ) : null}

            {selected?.can.update && onEditDeal ? (
              <Pressable
                onPress={() => {
                  const deal = selected;
                  setSelected(null);
                  onEditDeal(deal);
                }}
                style={{
                  backgroundColor: theme.primaryLight,
                  borderRadius: radius.md,
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 14 }}>Edit deal</Text>
              </Pressable>
            ) : null}

            <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>
              {selected?.can.update ? 'Move to stage' : 'You cannot move this deal'}
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {data.stages.map((stage) => {
                const isCurrent = selected?.stage?.id === stage.id;

                return (
                  <Pressable
                    key={stage.id}
                    disabled={!selected?.can.update || isCurrent || moving}
                    onPress={() => move(stage.id)}
                    style={({ pressed }) => [
                      {
                        paddingHorizontal: 13,
                        paddingVertical: 9,
                        borderRadius: radius.pill,
                        backgroundColor: isCurrent ? theme.primary : theme.surfaceOffset,
                        opacity: !selected?.can.update || moving ? 0.5 : 1,
                      },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '600',
                        color: isCurrent ? '#fff' : theme.textSecondary,
                      }}
                    >
                      {stage.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
