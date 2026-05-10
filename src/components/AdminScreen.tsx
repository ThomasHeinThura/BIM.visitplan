import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme, fonts, radii } from '../context/ThemeContext';
import { approveUser, getFinancialQuarters, getFinancialYears, getSectors, getUsers, rejectUser, upsertClient, upsertFinancialQuarter, upsertFinancialYear, upsertSector } from '../lib/cockpit';
import type { AccountType, ClientStatus, CockpitFinancialYear, CockpitUser } from '../types';
import { Badge, Card, PrimaryButton, SecondaryButton } from './ui';

type Tab = 'tools' | 'approvals';

type Props = {
  currentUser: CockpitUser;
};

function UserCard({
  u,
  onApprove,
  onReject,
  approving,
}: {
  u: CockpitUser;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  approving?: string | null;
}) {
  const { theme } = useTheme();
  const busy = approving === u._id;
  return (
    <Card style={styles.card}> 
      <Text style={[styles.cardName, { color: theme.text }]}>{u.name}</Text>
      <Text style={[styles.cardEmail, { color: theme.textSecondary }]}>{u.email}</Text>
      {(u.team) && (
        <View style={{ marginTop: 6 }}>
          <Badge tone="teal">{u.team}</Badge>
        </View>
      )}
      {onApprove && onReject && (
        <View style={styles.actionRow}>
          <View style={{ flex: 1.4 }}>
            <PrimaryButton
              label={busy ? 'Updating…' : 'Approve as AM'}
              onPress={() => !busy && onApprove(u._id)}
              disabled={busy}
              icon={busy ? <ActivityIndicator color="#fff" size="small" /> : undefined}
            />
          </View>
          <View style={{ flex: 1 }}>
            <SecondaryButton label="Reject" onPress={() => { if (!busy) onReject(u._id); }} style={busy ? { opacity: 0.6 } : undefined} />
          </View>
        </View>
      )}
    </Card>
  );
}

export default function AdminScreen({ currentUser }: Props) {
  const { theme } = useTheme();
  const [ownedSectors, setOwnedSectors] = useState(['Software', 'Banking']);
  const [tab, setTab] = useState<Tab>('tools');
  const [pending, setPending] = useState<CockpitUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toolMessage, setToolMessage] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientSector, setClientSector] = useState('Software');
  const [clientAccountType, setClientAccountType] = useState<AccountType>('Named Account');
  const [clientStatus, setClientStatus] = useState<ClientStatus>('Active');
  const [sectorName, setSectorName] = useState('');
  const [submittingClient, setSubmittingClient] = useState(false);
  const [submittingSector, setSubmittingSector] = useState(false);
  const [syncingCalendar, setSyncingCalendar] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [pendingData, sectorData] = await Promise.all([
        getUsers({ filter: { approval_status: 'pending' } }),
        getSectors().catch(() => []),
      ]);
      setPending(pendingData);
      if (sectorData.length > 0) {
        setOwnedSectors(sectorData.slice(0, 12));
      }
      setError(null);
    } catch {
      setError('Could not load user data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (userId: string) => {
    setApproving(userId);
    try {
      await approveUser(userId, 'am');
      setPending((prev) => prev.filter((u) => u._id !== userId));
    } catch {
      setError('Failed to approve user. Please try again.');
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async (userId: string) => {
    setApproving(userId);
    try {
      await rejectUser(userId);
      setPending((prev) => prev.filter((u) => u._id !== userId));
    } catch {
      setError('Failed to reject user. Please try again.');
    } finally {
      setApproving(null);
    }
  };

  const handleCreateClient = async () => {
    if (!clientName.trim()) {
      setToolMessage({ tone: 'error', text: 'Client name is required.' });
      return;
    }
    setSubmittingClient(true);
    setToolMessage(null);
    try {
      await upsertClient({
        name: clientName.trim(),
        sector: clientSector,
        account_type: clientAccountType,
        status: clientStatus,
      });
      setClientName('');
      setToolMessage({ tone: 'success', text: `Created client "${clientName.trim()}".` });
    } catch {
      setToolMessage({ tone: 'error', text: 'Could not create client.' });
    } finally {
      setSubmittingClient(false);
    }
  };

  const handleCreateSector = async () => {
    const trimmed = sectorName.trim();
    if (!trimmed) {
      setToolMessage({ tone: 'error', text: 'Sector name is required.' });
      return;
    }
    setSubmittingSector(true);
    setToolMessage(null);
    try {
      await upsertSector({ name: trimmed, active: true });
      setOwnedSectors((current) => current.includes(trimmed) ? current : [...current, trimmed]);
      setSectorName('');
      setToolMessage({ tone: 'success', text: `Created sector "${trimmed}".` });
    } catch {
      setToolMessage({ tone: 'error', text: 'Could not create sector.' });
    } finally {
      setSubmittingSector(false);
    }
  };

  const handleSyncCalendar = async () => {
    setSyncingCalendar(true);
    setToolMessage(null);
    try {
      const currentYear = new Date().getFullYear();
      const targetYears = Array.from({ length: 5 }, (_, index) => currentYear - 2 + index);
      const existingYears = await getFinancialYears({ limit: 50 });
      const yearByValue = new Map(existingYears.map((year) => [year.year, year]));
      const ensuredYears: CockpitFinancialYear[] = [];

      for (const yearValue of targetYears) {
        const existing = yearByValue.get(yearValue);
        if (existing) {
          ensuredYears.push(existing);
          continue;
        }
        const created = await upsertFinancialYear({
          name: `FY ${yearValue}`,
          year: yearValue,
          active: true,
        });
        ensuredYears.push(created);
      }

      const existingQuarters = await getFinancialQuarters({ limit: 200 });
      const existingQuarterKeys = new Set(existingQuarters.map((quarter) => `${quarter.year?._id}:${quarter.quarter_number}`));

      for (const year of ensuredYears) {
        for (const quarterNumber of [1, 2, 3, 4] as const) {
          const key = `${year._id}:${quarterNumber}`;
          if (existingQuarterKeys.has(key)) continue;
          await upsertFinancialQuarter({
            name: `Q${quarterNumber} FY${year.year}`,
            year: { _id: year._id, name: year.name },
            quarter_number: quarterNumber,
            active: true,
          });
        }
      }

      setToolMessage({ tone: 'success', text: 'Five years of financial quarters are ready.' });
    } catch {
      setToolMessage({ tone: 'error', text: 'Could not sync financial years and quarters.' });
    } finally {
      setSyncingCalendar(false);
    }
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    hero: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 10 },
    eyebrow: {
      fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase',
      color: theme.textFaint, marginBottom: 6,
    },
    title: { fontSize: 16, fontWeight: '700', color: theme.text, fontFamily: fonts.display },
    subtitle: { fontSize: 13, color: theme.textSecondary, marginTop: 4 },
    statRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
    statCard: { flex: 1, paddingVertical: 12, alignItems: 'center' },
    statValue: { fontSize: 18, fontWeight: '700', color: theme.text, fontFamily: fonts.display },
    statLabel: { fontSize: 10, color: theme.textSecondary, marginTop: 2 },
    sectionBlock: { paddingHorizontal: 16, paddingBottom: 12 },
    sectionLabel: {
      fontSize: 10, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase',
      color: theme.textFaint, marginBottom: 6,
    },
    sectorWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    toolCard: { padding: 0 },
    toolRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
    toolTitle: { fontSize: 13, fontWeight: '600', color: theme.text, fontFamily: fonts.display },
    toolMeta: { fontSize: 10, color: theme.textSecondary, marginTop: 2 },
    helperText: { fontSize: 10, color: theme.textFaint, paddingTop: 6, paddingHorizontal: 4 },
    toolStack: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
    toolFormCard: { padding: 14 },
    toolCardTitle: { fontSize: 13, fontWeight: '700', color: theme.text, fontFamily: fonts.display, marginBottom: 10 },
    textInput: {
      backgroundColor: theme.inputBg,
      borderWidth: 1.5,
      borderColor: theme.inputBorder,
      borderRadius: radii.md,
      paddingHorizontal: 12,
      paddingVertical: 11,
      fontSize: 14,
      color: theme.text,
      marginBottom: 10,
    },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 12 },
    optionChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radii.full,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surfaceOffset,
    },
    optionChipActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryLight,
    },
    optionChipText: { fontSize: 11, fontWeight: '600', color: theme.textSecondary },
    optionChipTextActive: { color: theme.primary },
    messageCard: { marginHorizontal: 16, marginBottom: 12 },
    approvalMeta: { fontSize: 10, color: theme.textFaint, marginTop: 2 },
    tabRow: {
      flexDirection: 'row',
      borderBottomWidth: 1.5,
      borderBottomColor: theme.divider,
      marginHorizontal: 16,
      marginBottom: 10,
    },
    tabBtn: {
      flex: 1, paddingVertical: 8, alignItems: 'center',
    },
    tabBtnActive: { borderBottomWidth: 2.5, borderBottomColor: theme.primary, marginBottom: -1.5 },
    tabLabel: { fontSize: 12, fontWeight: '600', color: theme.textFaint, fontFamily: fonts.display },
    tabLabelActive: { color: theme.primary, fontWeight: '700' },
    badge: {
      backgroundColor: theme.error, borderRadius: 10,
      minWidth: 18, height: 18, paddingHorizontal: 5,
      justifyContent: 'center', alignItems: 'center',
      marginLeft: 6,
    },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errText: { color: theme.error, textAlign: 'center', margin: 16 },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyText: { fontSize: 15, color: theme.textSecondary, textAlign: 'center' },
    sectionHeader: {
      fontSize: 10, fontWeight: '700', color: theme.textSecondary,
      paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4,
      textTransform: 'uppercase', letterSpacing: 0.5,
    },
  });

  if (loading) {
    return <View style={s.loader}><ActivityIndicator color={theme.primary} /></View>;
  }

  return (
    <View style={s.container}>
      <View style={s.hero}>
        <Text style={s.eyebrow}>Admin Dashboard</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={s.title}>Admin</Text>
          <Badge tone="purple">Admin + Management</Badge>
        </View>
      </View>

      <View style={s.statRow}>
        <Card style={s.statCard}>
          <Text style={s.statValue}>{pending.length}</Text>
          <Text style={s.statLabel}>Approvals</Text>
        </Card>
        <Card style={s.statCard}>
          <Text style={[s.statValue, { color: theme.primary }]}>{ownedSectors.length}</Text>
          <Text style={s.statLabel}>Sectors</Text>
        </Card>
        <Card style={s.statCard}>
          <Text style={s.statValue}>{currentUser.name?.split(' ')[0] ?? 'Admin'}</Text>
          <Text style={s.statLabel}>Current User</Text>
        </Card>
      </View>

      <View style={s.sectionBlock}>
        <Text style={s.sectionLabel}>Owned Sectors</Text>
        <Card>
          <View style={s.sectorWrap}>
            {ownedSectors.map((sector) => (
              <Badge key={sector} tone="teal">{sector}</Badge>
            ))}
          </View>
        </Card>
      </View>

      <View style={s.sectionBlock}>
        <Card style={s.toolCard}>
          <View style={s.toolRow}>
            <View>
              <Text style={s.toolTitle}>Admin Tools</Text>
              <Text style={s.toolMeta}>Sectors, quarters, approvals</Text>
            </View>
            <Badge tone="purple">Admin</Badge>
          </View>
        </Card>
        <Text style={s.helperText}>Team Overview lives in Reports → Teams</Text>
      </View>

      <View style={s.tabRow}>
        <TouchableOpacity
          style={[s.tabBtn, tab === 'tools' && s.tabBtnActive]}
          onPress={() => setTab('tools')}
        >
          <Text style={[s.tabLabel, tab === 'tools' && s.tabLabelActive]}>
            Tools
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, tab === 'approvals' && s.tabBtnActive]}
          onPress={() => setTab('approvals')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[s.tabLabel, tab === 'approvals' && s.tabLabelActive]}>Approvals</Text>
            {pending.length > 0 && (
              <View style={s.badge}>
                <Text style={s.badgeText}>{pending.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {error && <Text style={s.errText}>{error}</Text>}
      {toolMessage ? (
        <Card style={s.messageCard}>
          <Text style={{
            color: toolMessage.tone === 'error' ? theme.error : toolMessage.tone === 'success' ? theme.success : theme.text,
            fontSize: 12,
            fontWeight: '600',
          }}>
            {toolMessage.text}
          </Text>
        </Card>
      ) : null}

      {tab === 'tools' ? (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.primary} />
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <View style={s.toolStack}>
            <Card style={s.toolFormCard}>
              <Text style={s.toolCardTitle}>Create Client</Text>
              <TextInput
                value={clientName}
                onChangeText={setClientName}
                placeholder="Client name"
                placeholderTextColor={theme.textFaint}
                style={s.textInput}
              />
              <Text style={s.sectionLabel}>Sector</Text>
              <View style={s.chipWrap}>
                {['Software', 'Banking', 'Microfinance', 'MDR', 'Healthcare', 'Insurance', 'Telecom', 'Media', 'Government'].map((sector) => (
                  <TouchableOpacity key={sector} onPress={() => setClientSector(sector)} style={[s.optionChip, clientSector === sector && s.optionChipActive]}>
                    <Text style={[s.optionChipText, clientSector === sector && s.optionChipTextActive]}>{sector}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={s.sectionLabel}>Account Type</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
                {(['Named Account', 'Key Account'] as AccountType[]).map((type) => (
                  <TouchableOpacity key={type} onPress={() => setClientAccountType(type)} style={[s.optionChip, clientAccountType === type && s.optionChipActive, { flex: 1, alignItems: 'center' }]}> 
                    <Text style={[s.optionChipText, clientAccountType === type && s.optionChipTextActive]}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={s.sectionLabel}>Status</Text>
              <View style={s.chipWrap}>
                {(['Active', 'Hold', 'Inactive', 'Churned', 'Prospect'] as ClientStatus[]).map((status) => (
                  <TouchableOpacity key={status} onPress={() => setClientStatus(status)} style={[s.optionChip, clientStatus === status && s.optionChipActive]}>
                    <Text style={[s.optionChipText, clientStatus === status && s.optionChipTextActive]}>{status}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <PrimaryButton label={submittingClient ? 'Creating…' : 'Create Client'} onPress={handleCreateClient} disabled={submittingClient} style={{ marginTop: 2 }} />
            </Card>

            <Card style={s.toolFormCard}>
              <Text style={s.toolCardTitle}>Create Sector</Text>
              <TextInput
                value={sectorName}
                onChangeText={setSectorName}
                placeholder="Sector name"
                placeholderTextColor={theme.textFaint}
                style={s.textInput}
              />
              <PrimaryButton label={submittingSector ? 'Creating…' : 'Create Sector'} onPress={handleCreateSector} disabled={submittingSector} style={{ marginBottom: 12 }} />
              <Text style={s.sectionLabel}>Existing Sectors (9)</Text>
              <View style={s.sectorWrap}>
                {ownedSectors.map((sector) => (
                  <Badge key={sector} tone="teal">{sector}</Badge>
                ))}
              </View>
            </Card>

            <Card style={s.toolFormCard}>
              <Text style={s.toolCardTitle}>Financial Calendar</Text>
              <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 12 }}>
                Create five years of financial years and quarters inside Cockpit so visit creation can select them.
              </Text>
              <PrimaryButton label={syncingCalendar ? 'Syncing…' : 'Sync 5 Years'} onPress={handleSyncCalendar} disabled={syncingCalendar} />
            </Card>

            <Card style={{ padding: 0 }}>
              <View style={s.toolRow}>
                <Text style={[s.toolTitle, { color: theme.error }]}>Sign out</Text>
                <Badge tone="error">Exit</Badge>
              </View>
            </Card>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={pending}
          keyExtractor={(item) => item._id}
          ListHeaderComponent={
            <Text style={s.sectionHeader}>{pending.length} pending</Text>
          }
          renderItem={({ item }) => (
            <UserCard
              u={item}
              onApprove={handleApprove}
              onReject={handleReject}
              approving={approving}
            />
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyText}>No pending approvals.</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.primary} />
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16, marginBottom: 10, borderRadius: radii.lg, padding: 16,
  },
  cardName: { fontSize: 15, fontWeight: '700', marginBottom: 2, fontFamily: fonts.display },
  cardEmail: { fontSize: 13, marginBottom: 2 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
});
