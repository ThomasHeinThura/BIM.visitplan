/**
 * All visits, with status filtering and search.
 *
 * Filtering and search are server-side. Fetching everything and filtering locally
 * would be wrong twice over: it does not scale past the first page, and it implies
 * the client received rows the row-level scope should have withheld.
 */

import React, { useEffect, useState } from 'react';
import { FlatList, Text, View } from 'react-native';

import { fonts, useTheme } from '../../context/ThemeContext';
import type { VisitPlan, VisitStatusValue } from '../../lib/crm/types';
import { listVisits } from '../../lib/crm/visits';
import { FilterTab, SearchBar } from '../ui';
import { EmptyState, ErrorState, LoadingState, NoAccessState } from './States';
import { useResource } from './useResource';
import { VisitCard } from './VisitCard';

type StatusFilter = 'all' | VisitStatusValue;

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'planned', label: 'Planned' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

export function VisitListScreen({ onOpenVisit }: { onOpenVisit?: (visit: VisitPlan) => void }) {
  const { theme } = useTheme();

  const [status, setStatus] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  // Debounced rather than fired per keystroke: the search hits the database with two
  // LIKE predicates, and SearchBar offers no submit affordance to key off instead.
  const [committedSearch, setCommittedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setCommittedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, loading, error, forbidden, refetch, refreshing } = useResource(
    (signal) =>
      listVisits(
        {
          status: status === 'all' ? undefined : status,
          search: committedSearch || undefined,
          per_page: 50,
        },
        signal,
      ),
    [status, committedSearch],
  );

  const visits = data?.data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ paddingTop: 12, paddingHorizontal: 16 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search visits or clients" />
      </View>

      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 }}>
        {FILTERS.map((filter) => (
          <FilterTab
            key={filter.key}
            label={filter.label}
            active={status === filter.key}
            onPress={() => setStatus(filter.key)}
          />
        ))}
      </View>

      {forbidden ? (
        <NoAccessState what="visit plans" />
      ) : loading ? (
        <LoadingState label="Loading visits…" />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <FlatList
          data={visits}
          keyExtractor={(visit) => String(visit.id)}
          refreshing={refreshing}
          onRefresh={refetch}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 32 }}
          renderItem={({ item }) => (
            <VisitCard
              visit={item}
              onPress={onOpenVisit ? () => onOpenVisit(item) : undefined}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="◷"
              title={committedSearch ? 'No matches' : 'No visits yet'}
              message={
                committedSearch
                  ? `Nothing matched "${committedSearch}". Try a different client or title.`
                  : status === 'all'
                    ? 'Visits you plan will appear here.'
                    : `You have no ${status} visits.`
              }
            />
          }
          ListFooterComponent={
            data && data.meta.total > visits.length ? (
              <Text
                style={{
                  textAlign: 'center',
                  color: theme.textFaint,
                  fontSize: 12,
                  paddingVertical: 16,
                  fontFamily: fonts.body,
                }}
              >
                Showing {visits.length} of {data.meta.total}
              </Text>
            ) : null
          }
        />
      )}
    </View>
  );
}
