import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useTheme, fonts } from '../context/ThemeContext';
import { getClientsByFilter, getVisits } from '../lib/cockpit';
import type { CockpitClient, CockpitUser } from '../types';
import { Card, FilterTab, Icon, SearchBar } from './ui';

type Props = {
  user: CockpitUser;
  onOpenClient?: (client: CockpitClient) => void;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// Deterministic palette index from client _id
function paletteIdx(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  return h % 6;
}

// ─── Component ────────────────────────────────────────────────────────────────

const STATUS_FILTERS = ['Active', 'Hold', 'Prospect', 'Churned', 'Inactive'] as const;
const ACCOUNT_FILTERS = ['Key Account', 'Named Account'] as const;

export default function ClientListScreen({ user: _user, onOpenClient }: Props) {
  const { theme } = useTheme();

  const [clients, setClients] = useState<CockpitClient[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);
  const [visitCounts, setVisitCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [error, setError] = useState<string | null>(null);

  // Palette colours (bg + fg) indexed 0–5
  const palettes = [
    { bg: theme.primaryLight, fg: theme.primary },
    { bg: theme.warningLight, fg: theme.warning },
    { bg: theme.purpleLight, fg: theme.purple },
    { bg: theme.orangeLight, fg: theme.orange },
    { bg: theme.surfaceOffset, fg: theme.textSecondary },
    { bg: theme.successLight, fg: theme.success },
  ];

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const clientData = await getClientsByFilter({ amId: null, limit: 500 });
      setClients(clientData);

      // Extract sectors from already-fetched client data (no extra API call needed)
      const sectorSet = new Set<string>();
      for (const c of clientData) { if (c.sector) sectorSet.add(c.sector); }
      setSectors(Array.from(sectorSet).sort());

      // Fetch visit counts separately — non-fatal if visits collection is empty/missing
      try {
        const visitData = await getVisits({
          limit: 500,
          sort: { date: -1 },
        });
        const counts: Record<string, number> = {};
        for (const v of visitData) {
          if (v.client?._id) counts[v.client._id] = (counts[v.client._id] ?? 0) + 1;
        }
        setVisitCounts(counts);
      } catch (visitErr) {
        console.warn('[ClientList] Could not load visit counts:', visitErr);
      }
    } catch (err) {
      console.error('[ClientList] Failed to load clients:', err);
      setError('Could not load clients. Check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filterTabs = useMemo(
    () => ['All', ...ACCOUNT_FILTERS, ...STATUS_FILTERS, ...sectors],
    [sectors],
  );

  const filtered = useMemo(() => {
    let list = clients;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) => c.name.toLowerCase().includes(q) || (c.sector ?? '').toLowerCase().includes(q),
      );
    }
    if (activeFilter === 'All') return list;
    if ((STATUS_FILTERS as readonly string[]).includes(activeFilter))
      return list.filter((c) => c.status === activeFilter);
    if ((ACCOUNT_FILTERS as readonly string[]).includes(activeFilter))
      return list.filter((c) => c.account_type === activeFilter);
    return list.filter((c) => c.sector === activeFilter);
  }, [clients, search, activeFilter]);

  // ─── Styles (inline with theme tokens) ───────────────────────────────────

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>

      {/* ── Header ── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
      }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text, letterSpacing: -0.3, fontFamily: fonts.display }}>
          All Clients
        </Text>
        <View style={{
          backgroundColor: theme.surfaceOffset, borderRadius: 999,
          paddingHorizontal: 10, paddingVertical: 3,
        }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSecondary }}>
            {filtered.length} total
          </Text>
        </View>
      </View>

      {/* ── Search ── */}
      <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search all clients…"
        />
      </View>

      {/* ── Filter tabs ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, flexShrink: 0 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 10, paddingTop: 2, gap: 6, flexDirection: 'row', alignItems: 'center' }}
      >
        {filterTabs.map((tab) => {
          return (
            <FilterTab
              key={tab}
              label={tab}
              active={activeFilter === tab}
              onPress={() => setActiveFilter(tab)}
            />
          );
        })}
      </ScrollView>

      {error && (
        <Text style={{ color: theme.error, textAlign: 'center', marginHorizontal: 16, marginBottom: 8, fontSize: 13 }}>
          {error}
        </Text>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.primary} />
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 110 }}
        renderItem={({ item, index }) => {
          const pal = palettes[paletteIdx(item._id)];
          const initials = getInitials(item.name);
          const count = visitCounts[item._id] ?? 0;
          const meta = [item.sector, item.account_type, count > 0 ? `${count} visit${count !== 1 ? 's' : ''}` : null].filter(Boolean).join(' · ');
          return (
            <Card
              onPress={() => onOpenClient?.(item)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                paddingHorizontal: 14, paddingVertical: 12,
                marginTop: index === 0 ? 0 : 8,
              }}
            >
              <View style={{
                width: 36, height: 36, borderRadius: 10,
                backgroundColor: pal.bg,
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: pal.fg }}>{initials}</Text>
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text, fontFamily: fonts.display }} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }} numberOfLines={2}>
                  {meta || 'No sector'}
                </Text>
              </View>

              <View style={{ alignItems: 'flex-end', gap: 6, marginLeft: 8 }}>
                <Text style={{ fontSize: 11, color: theme.textFaint }}>{item.status}</Text>
                <Icon.ChevronRight size={16} color={theme.textFaint} />
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text, marginBottom: 4 }}>
              No clients found
            </Text>
            <Text style={{ fontSize: 13, color: theme.textSecondary, textAlign: 'center' }}>
              Try a different search or filter
            </Text>
          </View>
        }
      />
    </View>
  );
}
