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

import { fonts, radii, useTheme } from '../../context/ThemeContext';
import { getPipeline, moveDealStage } from '../../lib/crm/deals';
import type { Deal, PipelineColumn, StageTypeValue } from '../../lib/crm/types';
import { Badge } from '../ui';
import { EmptyState, ErrorState, LoadingState, NoAccessState } from './States';
import { useResource } from './useResource';

const COLUMN_WIDTH = 264;

/** Colour by stage TYPE, so a renamed stage keeps its meaning. */
function toneForStage(type: StageTypeValue): 'teal' | 'info' | 'success' | 'error' | 'muted' {
  switch (type) {
    case 'lead':
      return 'teal';
    case 'progress':
      return 'info';
    case 'won':
      return 'success';
    case 'lost':
      return 'error';
    default:
      return 'muted';
  }
}

function formatValue(value: string | null): string | null {
  if (value === null) return null;

  const amount = Number(value);
  if (!Number.isFinite(amount) || amount === 0) return null;

  // Compact so a column header stays readable at 264pt.
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;

  return amount.toFixed(0);
}

function DealCard({ deal, onPress }: { deal: Deal; onPress: () => void }) {
  const { theme } = useTheme();
  const value = formatValue(deal.value);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: theme.surface,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: theme.border,
          padding: 12,
          marginBottom: 8,
          gap: 5,
        },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text
        numberOfLines={2}
        style={{ fontSize: 13, fontWeight: '600', color: theme.text, fontFamily: fonts.display }}
      >
        {deal.title}
      </Text>

      {deal.client ? (
        <Text numberOfLines={1} style={{ fontSize: 11, color: theme.textSecondary }}>
          {deal.client.name}
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        {value ? (
          <Text style={{ fontSize: 12, fontWeight: '700', color: theme.primary, fontFamily: fonts.display }}>
            {value}
          </Text>
        ) : (
          <Text style={{ fontSize: 11, color: theme.textFaint }}>No value</Text>
        )}

        {deal.owner ? (
          <Text numberOfLines={1} style={{ fontSize: 10, color: theme.textFaint, flexShrink: 1 }}>
            {deal.owner.name}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function Column({
  column,
  onOpenDeal,
}: {
  column: PipelineColumn;
  onOpenDeal: (deal: Deal) => void;
}) {
  const { theme } = useTheme();
  const total = formatValue(column.total_value);

  return (
    <View
      style={{
        width: COLUMN_WIDTH,
        backgroundColor: theme.surfaceAlt,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: theme.border,
        padding: 10,
        marginRight: 10,
      }}
    >
      <View style={{ gap: 6, marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text
            numberOfLines={1}
            style={{ flex: 1, fontSize: 13, fontWeight: '700', color: theme.text, fontFamily: fonts.display }}
          >
            {column.name}
          </Text>
          <Badge tone={toneForStage(column.type)}>{String(column.deal_count)}</Badge>
        </View>

        {total ? (
          <Text style={{ fontSize: 11, color: theme.textSecondary }}>{total} total</Text>
        ) : null}
      </View>

      {column.deals.length === 0 ? (
        <View
          style={{
            paddingVertical: 22,
            alignItems: 'center',
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: theme.border,
            borderRadius: radii.md,
          }}
        >
          <Text style={{ fontSize: 11, color: theme.textFaint }}>Empty</Text>
        </View>
      ) : (
        column.deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} onPress={() => onOpenDeal(deal)} />
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
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <Text style={{ fontSize: 12, color: theme.textSecondary }}>Pipeline</Text>
        <Text style={{ fontSize: 17, fontWeight: '700', color: theme.text, fontFamily: fonts.display }}>
          {data.sector.name}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor={theme.primary} />
        }
      >
        {data.stages.map((column) => (
          <Column key={column.id} column={column} onOpenDeal={setSelected} />
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
              borderTopLeftRadius: radii.xl,
              borderTopRightRadius: radii.xl,
              padding: 20,
              paddingBottom: 34,
              gap: 12,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text, fontFamily: fonts.display }}>
              {selected?.title}
            </Text>

            {selected?.client ? (
              <Text style={{ fontSize: 13, color: theme.textSecondary }}>{selected.client.name}</Text>
            ) : null}

            {moveError ? (
              <View style={{ backgroundColor: theme.errorLight, borderRadius: radii.md, padding: 10 }}>
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
                  borderRadius: radii.md,
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
                        borderRadius: radii.full,
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
