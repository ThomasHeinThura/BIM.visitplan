import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { getClientsByFilter, getSectors } from '../lib/cockpit';
import type { ClientStatus, CockpitClient, CockpitUser, SectorName } from '../types';
import { CLIENT_STATUSES } from '../types';

type Props = {
  user: CockpitUser;
  onOpenClient?: (client: CockpitClient) => void;
};

function clientStatusStyle(theme: ReturnType<typeof useTheme>['theme'], status?: ClientStatus | null) {
  switch (status) {
    case 'Active': return { bg: theme.statusActive, text: theme.statusActiveText };
    case 'Hold': return { bg: theme.statusHold, text: theme.statusHoldText };
    case 'Inactive': return { bg: theme.statusInactive, text: theme.statusInactiveText };
    case 'Churned': return { bg: theme.statusChurned, text: theme.statusChurnedText };
    case 'Prospect': return { bg: theme.statusProspect, text: theme.statusProspectText };
    default: return { bg: theme.surfaceAlt, text: theme.textSecondary };
  }
}

export default function ClientListScreen({ user, onOpenClient }: Props) {
  const { theme } = useTheme();
  const [clients, setClients] = useState<CockpitClient[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState<SectorName | null>(null);
  const [statusFilter, setStatusFilter] = useState<ClientStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [clientData, sectorData] = await Promise.all([
        getClientsByFilter({
          sector: sectorFilter,
          status: statusFilter,
          amId: user.role === 'am' ? null : null, // AMs see all clients (filter by visit assignment)
          limit: 300,
        }),
        getSectors(),
      ]);
      setClients(clientData);
      setSectors(sectorData);
      setError(null);
    } catch {
      setError('Could not load clients.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sectorFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = clients.filter((c) => {
    if (!search) return true;
    return c.name.toLowerCase().includes(search.toLowerCase());
  });

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    searchRow: { padding: 12, paddingBottom: 4 },
    searchInput: {
      backgroundColor: theme.inputBg, borderRadius: 10, borderWidth: 1,
      borderColor: theme.inputBorder, paddingHorizontal: 14, paddingVertical: 10,
      fontSize: 14, color: theme.text,
    },
    filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
    chip: {
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
      borderColor: theme.border,
    },
    chipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    chipText: { fontSize: 12, color: theme.textSecondary },
    chipTextActive: { fontSize: 12, color: '#fff', fontWeight: '600' },
    countText: { fontSize: 12, color: theme.textSecondary, paddingHorizontal: 16, paddingBottom: 6 },
    card: {
      backgroundColor: theme.surface, marginHorizontal: 12, marginBottom: 8,
      borderRadius: 12, padding: 14, elevation: 1,
      shadowColor: theme.cardShadow, shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 1, shadowRadius: 4,
    },
    cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    name: { fontSize: 15, fontWeight: '600', color: theme.text, flex: 1, marginRight: 8 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    badgeText: { fontSize: 11, fontWeight: '600' },
    meta: { fontSize: 12, color: theme.textSecondary, marginTop: 4 },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyText: { fontSize: 15, color: theme.textSecondary, textAlign: 'center' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errText: { color: theme.error, textAlign: 'center', margin: 16 },
  });

  if (loading) {
    return <View style={s.loader}><ActivityIndicator color={theme.primary} /></View>;
  }

  return (
    <View style={s.container}>
      {/* Search */}
      <View style={s.searchRow}>
        <TextInput
          style={s.searchInput}
          placeholder="Search clients…"
          placeholderTextColor={theme.textSecondary}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
      </View>

      {/* Sector filter chips */}
      <FlatList
        horizontal
        data={['All', ...sectors]}
        keyExtractor={(s) => s}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterRow}
        renderItem={({ item }) => {
          const active = item === 'All' ? sectorFilter === null : sectorFilter === item;
          return (
            <TouchableOpacity
              style={[s.chip, active && s.chipActive]}
              onPress={() => setSectorFilter(item === 'All' ? null : (item as SectorName))}
            >
              <Text style={active ? s.chipTextActive : s.chipText}>{item}</Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* Status filter chips */}
      <FlatList
        horizontal
        data={['All Status', ...CLIENT_STATUSES]}
        keyExtractor={(s) => s}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ ...s.filterRow, paddingTop: 0 }}
        renderItem={({ item }) => {
          const active = item === 'All Status' ? statusFilter === null : statusFilter === item;
          return (
            <TouchableOpacity
              style={[s.chip, active && s.chipActive]}
              onPress={() => setStatusFilter(item === 'All Status' ? null : (item as ClientStatus))}
            >
              <Text style={active ? s.chipTextActive : s.chipText}>{item}</Text>
            </TouchableOpacity>
          );
        }}
      />

      {error && <Text style={s.errText}>{error}</Text>}
      <Text style={s.countText}>{filtered.length} client{filtered.length !== 1 ? 's' : ''}</Text>

      {/* Client list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => {
          const st = clientStatusStyle(theme, item.status);
          return (
            <TouchableOpacity style={s.card} onPress={() => onOpenClient?.(item)} activeOpacity={0.75}>
              <View style={s.cardRow}>
                <Text style={s.name} numberOfLines={1}>{item.name}</Text>
                <View style={[s.badge, { backgroundColor: st.bg }]}>
                  <Text style={[s.badgeText, { color: st.text }]}>{item.status ?? 'Unknown'}</Text>
                </View>
              </View>
              <Text style={s.meta}>
                {[item.sector, item.account_type].filter(Boolean).join('  ·  ')}
              </Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>No clients found.</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.primary} />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    </View>
  );
}
