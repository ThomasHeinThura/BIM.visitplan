/**
 * Client directory, scoped server-side to the user's sector.
 */

import React, { useEffect, useState } from 'react';
import { FlatList, Text, View } from 'react-native';

import { useTheme } from '../../context/ThemeContext';
import { listClients } from '../../lib/crm/clients';
import type { Client } from '../../lib/crm/types';
import { Avatar, Card, Rise, SectorChip } from '../../ui/Surface';
import { space, type } from '../../ui/tokens';
import { SearchBar } from '../ui';
import { EmptyState, ErrorState, LoadingState, NoAccessState } from './States';
import { useResource } from './useResource';

function Metric({ value, label }: { value: number; label: string }) {
  const { theme } = useTheme();

  return (
    <View style={{ alignItems: 'center', gap: 1 }}>
      <Text style={[type.numeric, { color: value > 0 ? theme.text : theme.textFaint, fontSize: 14 }]}>
        {value}
      </Text>
      <Text style={[type.micro, { color: theme.textFaint, fontSize: 9 }]}>{label}</Text>
    </View>
  );
}

function ClientRow({ client, onPress }: { client: Client; onPress?: () => void }) {
  const { theme } = useTheme();

  return (
    <Card
      onPress={onPress}
      accent={client.sector?.color ?? null}
      style={{ marginHorizontal: space.lg, marginBottom: space.md }}
    >
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Avatar name={client.name} size={38} color={client.sector?.color} />

          <View style={{ flex: 1, gap: 3 }}>
            <Text numberOfLines={1} style={[type.heading, { color: theme.text }]}>
              {client.name}
            </Text>
            {client.industry ? (
              <Text numberOfLines={1} style={[type.bodySm, { color: theme.textSecondary }]}>
                {client.industry}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          {client.sector ? <SectorChip name={client.sector.name} color={client.sector.color} /> : null}

          <View style={{ flex: 1 }} />

          <View style={{ flexDirection: 'row', gap: space.lg }}>
            <Metric value={client.counts.contacts ?? 0} label="Contacts" />
            <Metric value={client.counts.visit_plans ?? 0} label="Visits" />
            <Metric value={client.counts.deals ?? 0} label="Deals" />
          </View>
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
      <View style={{ paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.md }}>
        <Text style={[type.micro, { color: theme.primary }]}>Territory</Text>
        <Text style={[type.display, { color: theme.text, marginBottom: space.md }]}>Clients</Text>
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
          renderItem={({ item, index }) => (
            <Rise index={index}>
              <ClientRow client={item} onPress={onOpenClient ? () => onOpenClient(item) : undefined} />
            </Rise>
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
                style={[
                  type.micro,
                  { textAlign: 'center', color: theme.textFaint, paddingVertical: space.lg },
                ]}
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
