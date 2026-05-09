import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { approveUser, getUsers, rejectUser } from '../lib/cockpit';
import type { CockpitUser } from '../types';

type Tab = 'approvals' | 'team';

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
    <View style={[styles.card, { backgroundColor: theme.surface, shadowColor: theme.cardShadow }]}>
      <Text style={[styles.cardName, { color: theme.text }]}>{u.name}</Text>
      <Text style={[styles.cardEmail, { color: theme.textSecondary }]}>{u.email}</Text>
      {(u.job_title || u.team) && (
        <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>
          {[u.job_title, u.team].filter(Boolean).join('  ·  ')}
        </Text>
      )}
      {onApprove && onReject && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.approveBtn, { backgroundColor: theme.success }]}
            onPress={() => !busy && onApprove(u._id)}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.actionBtnText}>Approve as AM</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.rejectBtn, { borderColor: theme.error }]}
            onPress={() => !busy && onReject(u._id)}
            disabled={busy}
          >
            <Text style={[styles.rejectBtnText, { color: theme.error }]}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function AdminScreen({ currentUser }: Props) {
  const { theme } = useTheme();
  const [tab, setTab] = useState<Tab>('approvals');
  const [pending, setPending] = useState<CockpitUser[]>([]);
  const [team, setTeam] = useState<CockpitUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [pendingData, teamData] = await Promise.all([
        getUsers({ filter: { approval_status: 'pending' } }),
        getUsers({ filter: { role: 'am', approval_status: 'approved' } }),
      ]);
      setPending(pendingData);
      setTeam(teamData);
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

  const tabData = tab === 'approvals' ? pending : team;

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    tabRow: {
      flexDirection: 'row', backgroundColor: theme.surface,
      borderBottomWidth: 1, borderBottomColor: theme.border,
    },
    tabBtn: {
      flex: 1, paddingVertical: 14, alignItems: 'center',
      borderBottomWidth: 2, borderBottomColor: 'transparent',
    },
    tabBtnActive: { borderBottomColor: theme.primary },
    tabLabel: { fontSize: 14, fontWeight: '500', color: theme.textSecondary },
    tabLabelActive: { color: theme.primary, fontWeight: '700' },
    badge: {
      backgroundColor: theme.error, borderRadius: 10,
      minWidth: 18, height: 18, paddingHorizontal: 5,
      justifyContent: 'center', alignItems: 'center',
      marginLeft: 6, position: 'absolute', right: 20, top: 10,
    },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errText: { color: theme.error, textAlign: 'center', margin: 16 },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyText: { fontSize: 15, color: theme.textSecondary, textAlign: 'center' },
    sectionHeader: {
      fontSize: 12, fontWeight: '600', color: theme.textSecondary,
      paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4,
      textTransform: 'uppercase', letterSpacing: 0.5,
    },
  });

  if (loading) {
    return <View style={s.loader}><ActivityIndicator color={theme.primary} /></View>;
  }

  return (
    <View style={s.container}>
      {/* Tabs */}
      <View style={s.tabRow}>
        <TouchableOpacity
          style={[s.tabBtn, tab === 'approvals' && s.tabBtnActive]}
          onPress={() => setTab('approvals')}
        >
          <Text style={[s.tabLabel, tab === 'approvals' && s.tabLabelActive]}>
            Approvals
          </Text>
          {pending.length > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{pending.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, tab === 'team' && s.tabBtnActive]}
          onPress={() => setTab('team')}
        >
          <Text style={[s.tabLabel, tab === 'team' && s.tabLabelActive]}>Team</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={s.errText}>{error}</Text>}

      <FlatList
        data={tabData}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={
          <Text style={s.sectionHeader}>
            {tab === 'approvals' ? `${pending.length} pending` : `${team.length} AM${team.length !== 1 ? 's' : ''}`}
          </Text>
        }
        renderItem={({ item }) => (
          <UserCard
            u={item}
            onApprove={tab === 'approvals' ? handleApprove : undefined}
            onReject={tab === 'approvals' ? handleReject : undefined}
            approving={approving}
          />
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>
              {tab === 'approvals' ? 'No pending approvals.' : 'No AMs found.'}
            </Text>
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

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16, marginBottom: 10, borderRadius: 12, padding: 16,
    elevation: 1, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4,
  },
  cardName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  cardEmail: { fontSize: 13, marginBottom: 2 },
  cardMeta: { fontSize: 12, marginBottom: 10 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  approveBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
  },
  rejectBtn: {
    paddingVertical: 8, paddingHorizontal: 20, borderRadius: 8,
    borderWidth: 1, alignItems: 'center',
  },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  rejectBtnText: { fontSize: 13, fontWeight: '600' },
});
