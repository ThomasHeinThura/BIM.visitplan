/**
 * Leads.
 *
 * A lead is a deal on a lead-type stage, so this is the deal list filtered by
 * stage_type. Filtering by type rather than a stage id is what makes it work for
 * someone who sees more than one sector — each sector's lead stage is a different row.
 */

import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { fonts, radii, useTheme } from '../../context/ThemeContext';
import { listDeals } from '../../lib/crm/deals';
import type { Deal, StageTypeValue } from '../../lib/crm/types';
import { Badge, Card, SearchBar } from '../ui';
import { EmptyState, ErrorState, LoadingState, NoAccessState } from './States';
import { useResource } from './useResource';

type Scope = 'lead' | 'all';

function DealRow({ deal, onPress }: { deal: Deal; onPress?: () => void }) {
  const { theme } = useTheme();

  const amount = deal.value === null ? null : Number(deal.value);
  const showValue = amount !== null && Number.isFinite(amount) && amount > 0;

  const tone: Record<StageTypeValue, 'teal' | 'info' | 'success' | 'error' | 'muted'> = {
    lead: 'teal',
    progress: 'info',
    won: 'success',
    lost: 'error',
    custom: 'muted',
  };

  return (
    <Card onPress={onPress} style={{ marginHorizontal: 16, marginBottom: 10 }}>
      <View style={{ gap: 6 }}>
        <Text
          numberOfLines={2}
          style={{ fontSize: 14, fontWeight: '600', color: theme.text, fontFamily: fonts.display }}
        >
          {deal.title}
        </Text>

        {deal.client ? (
          <Text numberOfLines={1} style={{ fontSize: 12, color: theme.textSecondary }}>
            {deal.client.name}
          </Text>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {deal.stage ? <Badge tone={tone[deal.stage.type]}>{deal.stage.name}</Badge> : null}
          {deal.sector ? <Badge tone="muted">{deal.sector.name}</Badge> : null}
          {showValue ? (
            <Text
              style={{ fontSize: 12, fontWeight: '700', color: theme.primary, fontFamily: fonts.display }}
            >
              {amount!.toLocaleString()}
            </Text>
          ) : null}
        </View>

        {deal.owner ? (
          <Text style={{ fontSize: 11, color: theme.textFaint }}>{deal.owner.name}</Text>
        ) : null}
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
      <View style={{ paddingTop: 12, paddingHorizontal: 16 }}>
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
              borderRadius: radii.full,
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
                borderRadius: radii.full,
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
          renderItem={({ item }) => (
            <DealRow deal={item} onPress={onOpenDeal ? () => onOpenDeal(item) : undefined} />
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
