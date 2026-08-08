/**
 * Client directory, scoped server-side to the user's sector.
 */

import React, { useEffect, useState } from 'react';
import { FlatList, Text, View } from 'react-native';

import { fonts, useTheme } from '../../context/ThemeContext';
import { listClients } from '../../lib/crm/clients';
import type { Client } from '../../lib/crm/types';
import { Badge, Card, SearchBar } from '../ui';
import { EmptyState, ErrorState, LoadingState, NoAccessState } from './States';
import { useResource } from './useResource';

function ClientRow({ client, onPress }: { client: Client; onPress?: () => void }) {
  const { theme } = useTheme();

  return (
    <Card onPress={onPress} style={{ marginHorizontal: 16, marginBottom: 10 }}>
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: 14,
              fontWeight: '600',
              color: theme.text,
              fontFamily: fonts.display,
            }}
          >
            {client.name}
          </Text>
          {client.sector ? <Badge tone="muted">{client.sector.name}</Badge> : null}
        </View>

        {client.industry ? (
          <Text numberOfLines={1} style={{ fontSize: 12, color: theme.textSecondary }}>
            {client.industry}
          </Text>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 14, marginTop: 2 }}>
          <Text style={{ fontSize: 11, color: theme.textFaint }}>
            {client.counts.contacts ?? 0} contacts
          </Text>
          <Text style={{ fontSize: 11, color: theme.textFaint }}>
            {client.counts.visit_plans ?? 0} visits
          </Text>
          <Text style={{ fontSize: 11, color: theme.textFaint }}>
            {client.counts.deals ?? 0} deals
          </Text>
        </View>
      </View>
    </Card>
  );
}

export function ClientListScreen({ onOpenClient }: { onOpenClient?: (client: Client) => void }) {
  const { theme } = useTheme();

  const [search, setSearch] = useState('');
  const [committedSearch, setCommittedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setCommittedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, loading, error, forbidden, refetch, refreshing } = useResource(
    (signal) => listClients({ search: committedSearch || undefined, per_page: 50 }, signal),
    [committedSearch],
  );

  const clients = data?.data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ paddingTop: 12, paddingHorizontal: 16, paddingBottom: 10 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search clients" />
      </View>

      {forbidden ? (
        <NoAccessState what="clients" />
      ) : loading ? (
        <LoadingState label="Loading clients…" />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <FlatList
          data={clients}
          keyExtractor={(client) => String(client.id)}
          refreshing={refreshing}
          onRefresh={refetch}
          contentContainerStyle={{ paddingBottom: 32 }}
          renderItem={({ item }) => (
            <ClientRow client={item} onPress={onOpenClient ? () => onOpenClient(item) : undefined} />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="◇"
              title={committedSearch ? 'No matches' : 'No clients yet'}
              message={
                committedSearch
                  ? `Nothing matched "${committedSearch}".`
                  : 'Clients in your sector will appear here once they are added in the CRM.'
              }
            />
          }
          ListFooterComponent={
            data && data.meta.total > clients.length ? (
              <Text
                style={{
                  textAlign: 'center',
                  color: theme.textFaint,
                  fontSize: 12,
                  paddingVertical: 16,
                  fontFamily: fonts.body,
                }}
              >
                Showing {clients.length} of {data.meta.total}
              </Text>
            ) : null
          }
        />
      )}
    </View>
  );
}
