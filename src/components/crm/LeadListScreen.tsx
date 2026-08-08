/**
 * Leads.
 *
 * A lead is a deal on a lead-type stage, so this is the deal list filtered by
 * stage_type. Filtering by type rather than a stage id is what makes it work for
 * someone who sees more than one sector — each sector's lead stage is a different row.
 */

import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { useTheme } from '../../context/ThemeContext';
import { listDeals } from '../../lib/crm/deals';
import type { Deal, StageTypeValue } from '../../lib/crm/types';
import { Avatar, Card, Rise, SectorChip, StatusPill } from '../../ui/Surface';
import { alpha, radius, space, type } from '../../ui/tokens';
import { SearchBar } from '../ui';
import { formatDealValue } from '../../lib/crm/money';
import { EmptyState, ErrorState, LoadingState, NoAccessState } from './States';
import { useResource } from './useResource';

type Scope = 'lead' | 'all';

function DealRow({ deal, onPress }: { deal: Deal; onPress?: () => void }) {
  const { theme } = useTheme();

  const amount = deal.value === null ? null : Number(deal.value);
  const showValue = amount !== null && Number.isFinite(amount) && amount > 0;

  const tone: Record<StageTypeValue, 'lead' | 'progress' | 'won' | 'lost'> = {
    lead: 'lead',
    progress: 'progress',
    won: 'won',
    lost: 'lost',
    custom: 'progress',
  };

  return (
    <Card
      onPress={onPress}
      accent={deal.sector?.color ?? null}
      style={{ marginHorizontal: space.lg, marginBottom: space.md }}
    >
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
          <Text numberOfLines={2} style={[type.heading, { flex: 1, color: theme.text }]}>
            {deal.title}
          </Text>

          {showValue ? (
            <Text style={[type.numeric, { color: theme.primary, fontSize: 16 }]}>
              {formatDealValue(deal)}
            </Text>
          ) : null}
        </View>

        {deal.client ? (
          <Text numberOfLines={1} style={[type.bodySm, { color: theme.textSecondary }]}>
            {deal.client.name}
          </Text>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {deal.stage ? <StatusPill label={deal.stage.name} tone={tone[deal.stage.type]} /> : null}
          {deal.sector ? <SectorChip name={deal.sector.name} color={deal.sector.color} /> : null}

          <View style={{ flex: 1 }} />

          {deal.owner ? <Avatar name={deal.owner.name} size={24} color={deal.sector?.color} /> : null}
        </View>
      </View>
    </Card>
  );
}

export function LeadListScreen({
  onOpenDeal,
  onAddLead,
  canCreate,
}: {
  onOpenDeal?: (deal: Deal) => void;
  onAddLead?: () => void;
  canCreate: boolean;
}) {
  const { theme } = useTheme();

  const [scope, setScope] = useState<Scope>('lead');
  const [search, setSearch] = useState('');
  const [committedSearch, setCommittedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setCommittedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, loading, error, forbidden, refetch, refreshing } = useResource(
    (signal) =>
      listDeals(
        {
          stage_type: scope === 'lead' ? 'lead' : undefined,
          search: committedSearch || undefined,
          per_page: 50,
        },
        signal,
      ),
    [scope, committedSearch],
  );

  const deals = data?.data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm }}>
        <Text style={[type.micro, { color: theme.primary }]}>Opportunities</Text>
        <Text style={[type.display, { color: theme.text, marginBottom: space.md }]}>
          {scope === 'lead' ? 'Leads' : 'All deals'}
        </Text>
        <SearchBar value={search} onChange={setSearch} placeholder="Search deals or clients" />
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 16,
          paddingVertical: 10,
        }}
      >
        {(['lead', 'all'] as Scope[]).map((key) => (
          <Pressable
            key={key}
            onPress={() => setScope(key)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: radius.pill,
              backgroundColor: scope === key ? theme.primary : theme.surfaceOffset,
              borderWidth: 1,
              borderColor: scope === key ? theme.primary : theme.border,
            }}
          >
            <Text
              style={{
                color: scope === key ? '#fff' : theme.textSecondary,
                fontSize: 12,
                fontWeight: scope === key ? '600' : '500',
              }}
            >
              {key === 'lead' ? 'Leads' : 'All deals'}
            </Text>
          </Pressable>
        ))}

        <View style={{ flex: 1 }} />

        {canCreate && onAddLead ? (
          <Pressable
            onPress={onAddLead}
            style={({ pressed }) => [
              {
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 13,
                paddingVertical: 7,
                borderRadius: radius.pill,
                backgroundColor: theme.primary,
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            {/* "Add lead", not "Lead": every row carries a stage badge that may also
                read "Lead", and a button sharing that word is ambiguous next to them. */}
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>+</Text>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Add lead</Text>
          </Pressable>
        ) : null}
      </View>

      {forbidden ? (
        <NoAccessState what="deals" />
      ) : loading ? (
        <LoadingState label="Loading deals…" />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <FlatList
          data={deals}
          keyExtractor={(deal) => String(deal.id)}
          refreshing={refreshing}
          onRefresh={refetch}
          contentContainerStyle={{ paddingBottom: 32 }}
          renderItem={({ item, index }) => (
            <Rise index={index}>
              <DealRow deal={item} onPress={onOpenDeal ? () => onOpenDeal(item) : undefined} />
            </Rise>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="◈"
              title={committedSearch ? 'No matches' : scope === 'lead' ? 'No leads yet' : 'No deals yet'}
              message={
                committedSearch
                  ? `Nothing matched "${committedSearch}".`
                  : scope === 'lead'
                    ? 'Add a lead to start tracking an opportunity through the pipeline.'
                    : 'Deals you own will appear here.'
              }
              actionLabel={canCreate && scope === 'lead' && !committedSearch ? 'Add a lead' : undefined}
              onAction={onAddLead}
            />
          }
          ListFooterComponent={
            data && data.meta.total > deals.length ? (
              <Text
                style={{
                  textAlign: 'center',
                  color: theme.textFaint,
                  fontSize: 12,
                  paddingVertical: 16,
                }}
              >
                Showing {deals.length} of {data.meta.total}
              </Text>
            ) : null
          }
        />
      )}
    </View>
  );
}
