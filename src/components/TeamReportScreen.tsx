import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme, fonts, radii } from '../context/ThemeContext';
import { getClients, getUsers, getVisitOutcomes, getVisits } from '../lib/cockpit';
import type { CockpitUser, CockpitVisit, CockpitVisitOutcome, UserRole } from '../types';
import { canAccessAllGroups, formatMeetingGroup, normalizeMeetingGroup } from '../utils/meetingGroups';
import { Badge, Card } from './ui';

type TeamRow = {
  userId: string;
  initials: string;
  name: string;
  sector: string;
  clients: number;
  visits: number;
  completed: number;
  pipelineUsd: number;
  status: { tone: 'success' | 'error' | 'warning' | 'muted'; emoji: string; text: string };
};

type DepartmentRow = {
  key: string;
  label: string;
  visits: number;
  completed: number;
  pipelineUsd: number;
  amCount: number;
};

type SectorRow = {
  key: string;
  label: string;
  visits: number;
  completed: number;
  pipelineUsd: number;
  clientCount: number;
};

type ContributorSummary = {
  key: string;
  name: string;
  roleLabel: string;
  visits: number;
};

type DepartmentDetailRow = {
  key: string;
  name: string;
  roleLabel: string;
  visits: number;
};

type SectorDetailRow = {
  key: string;
  clientName: string;
  visits: number;
  topContributors: ContributorSummary[];
};

type DetailSheet =
  | { type: 'department'; label: string }
  | { type: 'sector'; label: string }
  | null;

type TeamView = 'ams' | 'departments' | 'sectors';

const TONE_COLOR: Record<TeamRow['status']['tone'], string> = {
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
  muted: '#64748b',
};

function isNonEmptyString(value: string | undefined | null): value is string {
  return typeof value === 'string' && value.length > 0;
}

type Props = { onBack: () => void; onOpenAm: (userId: string) => void; currentUser: CockpitUser; viewerRole?: UserRole };

function getQuarterWindow(base = new Date()) {
  const quarterIndex = Math.floor(base.getMonth() / 3);
  const start = new Date(base.getFullYear(), quarterIndex * 3, 1);
  const end = new Date(base.getFullYear(), quarterIndex * 3 + 3, 0);
  return {
    quarterLabel: `Q${quarterIndex + 1} ${base.getFullYear()}`,
    subtitleLabel: `${start.toLocaleDateString('en-US', { month: 'short' })}–${end.toLocaleDateString('en-US', { month: 'short' })}`,
    from: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`,
    to: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`,
  };
}

function parsePipelineValue(nextAction?: string | null) {
  if (!nextAction) return 0;
  const match = nextAction.match(/pipeline value:\s*usd\s*([\d,]+)/i);
  if (!match) return 0;
  const value = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(value) ? value : 0;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function daysSince(dateIso?: string | null) {
  if (!dateIso) return null;
  const date = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
}

function formatClock(time?: string | null) {
  if (!time) return null;
  const [hourRaw = '0', minuteRaw = '0'] = time.split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return time;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}${minute ? `:${String(minute).padStart(2, '0')}` : ''}${suffix}`;
}

function buildStatus(visits: CockpitVisit[], outcomesByVisitId: Map<string, CockpitVisitOutcome>) {
  const activeVisit = visits.find((visit) => visit.status === 'in_progress');
  if (activeVisit) {
    return { tone: 'success' as const, emoji: '🟢', text: `Active — ${activeVisit.client?.name ?? activeVisit.title}` };
  }

  const overdue = visits.filter((visit) => (visit.status === 'completed' || visit.status === 'missed') && !outcomesByVisitId.has(visit._id)).length;
  if (overdue > 0) {
    return { tone: 'error' as const, emoji: '⚠️', text: `${overdue} outcome${overdue !== 1 ? 's' : ''} overdue` };
  }

  const nextVisit = [...visits]
    .filter((visit) => visit.status === 'scheduled' && visit.date)
    .sort((left, right) => `${left.date ?? ''} ${left.start_time ?? ''}`.localeCompare(`${right.date ?? ''} ${right.start_time ?? ''}`))[0];
  if (nextVisit) {
    return { tone: 'warning' as const, emoji: '🟡', text: `Planning — next at ${formatClock(nextVisit.start_time) ?? 'TBD'}` };
  }

  const latestVisit = [...visits]
    .filter((visit) => visit.date)
    .sort((left, right) => `${right.date ?? ''} ${right.start_time ?? ''}`.localeCompare(`${left.date ?? ''} ${left.start_time ?? ''}`))[0];
  const lastSeen = daysSince(latestVisit?.date);
  if (lastSeen != null) {
    return { tone: 'muted' as const, emoji: '🔵', text: `Idle — last visit ${lastSeen} day${lastSeen === 1 ? '' : 's'} ago` };
  }

  return { tone: 'muted' as const, emoji: '🔵', text: 'No recent visits' };
}

function formatRoleLabel(role?: UserRole | null) {
  if (role === 'am') return 'AM';
  if (role === 'sales') return 'Sales';
  if (role === 'solution') return 'Solution';
  if (role === 'management') return 'Management';
  if (role === 'admin') return 'Admin';
  return 'User';
}

function getVisitMemberIds(visit: CockpitVisit) {
  const ids = new Set<string>();
  if (visit.assigned_am?._id) ids.add(visit.assigned_am._id);
  for (const participant of visit.participants ?? []) {
    if (participant._id) ids.add(participant._id);
  }
  return ids;
}

function getVisitMemberSummaries(visit: CockpitVisit, usersById: Map<string, CockpitUser>, amRowsById?: Map<string, TeamRow>) {
  const members = new Map<string, { key: string; name: string; roleLabel: string }>();

  if (visit.assigned_am?._id) {
    const assignedUser = usersById.get(visit.assigned_am._id);
    const rowUser = amRowsById?.get(visit.assigned_am._id);
    members.set(visit.assigned_am._id, {
      key: visit.assigned_am._id,
      name: assignedUser?.name ?? visit.assigned_am.name ?? rowUser?.name ?? 'Unknown AM',
      roleLabel: assignedUser ? formatRoleLabel(assignedUser.role) : 'AM',
    });
  }

  for (const participant of visit.participants ?? []) {
    if (!participant._id) continue;
    const participantUser = usersById.get(participant._id);
    members.set(participant._id, {
      key: participant._id,
      name: participantUser?.name ?? participant.name ?? 'Unknown User',
      roleLabel: participantUser ? formatRoleLabel(participantUser.role) : 'Member',
    });
  }

  return Array.from(members.values());
}

export default function TeamReportScreen({ onBack, onOpenAm, currentUser, viewerRole }: Props) {
  const { theme } = useTheme();
  const [rows, setRows] = useState<TeamRow[]>([]);
  const [departmentRows, setDepartmentRows] = useState<DepartmentRow[]>([]);
  const [sectorRows, setSectorRows] = useState<SectorRow[]>([]);
  const [teamUsers, setTeamUsers] = useState<CockpitUser[]>([]);
  const [teamClients, setTeamClients] = useState<any[]>([]);
  const [teamVisits, setTeamVisits] = useState<CockpitVisit[]>([]);
  const [viewBy, setViewBy] = useState<TeamView>('ams');
  const [detailSheet, setDetailSheet] = useState<DetailSheet>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const quarterWindow = useMemo(() => getQuarterWindow(), []);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [users, clients, visits, outcomes] = await Promise.all([
        getUsers({ limit: 500 }),
        getClients({ limit: 1000, sort: { name: 1 } }),
        getVisits({ filter: { date: { $gte: quarterWindow.from, $lte: quarterWindow.to } }, limit: 2000, sort: { date: -1, start_time: -1 } }),
        getVisitOutcomes({ limit: 2000 }),
      ]);

      const effectiveRole = viewerRole ?? currentUser.role;
      const currentGroup = normalizeMeetingGroup(currentUser.meeting_group);
      const showAllGroups = canAccessAllGroups(effectiveRole, currentUser.meeting_group) || !currentGroup || currentGroup === 'account';

      const usersById = new Map(users.map((user) => [user._id, user]));

      const scopedVisits = visits.filter((visit) => {
        if (!showAllGroups) {
          const assignedUser = visit.assigned_am?._id ? usersById.get(visit.assigned_am._id) : null;
          return normalizeMeetingGroup(visit.meeting_group) === currentGroup
            || normalizeMeetingGroup(assignedUser?.meeting_group) === currentGroup;
        }
        return true;
      });

      const scopedClients = clients.filter((client) => {
        if (!showAllGroups) {
          const assignedUser = client.am?._id ? usersById.get(client.am._id) : null;
          return normalizeMeetingGroup(assignedUser?.meeting_group) === currentGroup;
        }
        return true;
      });
      const clientsById = new Map(clients.map((client) => [client._id, client]));

      const outcomesByVisitId = new Map(outcomes.filter((outcome) => outcome.visit?._id).map((outcome) => [outcome.visit!._id, outcome]));

      const rowUserIds = Array.from(new Set([
        ...scopedVisits.map((visit) => visit.assigned_am?._id).filter(isNonEmptyString),
        ...scopedClients.map((client) => client.am?._id).filter(isNonEmptyString),
      ]));

      const nextRows = rowUserIds.map((userId) => {
        const user = usersById.get(userId);
        if (!user) {
          const fallbackName = scopedVisits.find((visit) => visit.assigned_am?._id === userId)?.assigned_am?.name
            ?? scopedClients.find((client) => client.am?._id === userId)?.am?.name
            ?? 'Unknown AM';
          const userVisits = scopedVisits.filter((visit) => visit.assigned_am?._id === userId);
          const userVisitIds = new Set(userVisits.map((visit) => visit._id));
          const pipelineUsd = outcomes.reduce((sum, outcome) => {
            if (!outcome.visit?._id || !userVisitIds.has(outcome.visit._id)) return sum;
            return sum + parsePipelineValue(outcome.next_action);
          }, 0);
          return {
            userId,
            initials: getInitials(fallbackName),
            name: fallbackName,
            sector: 'Account Manager',
            clients: scopedClients.filter((client) => client.am?._id === userId).length,
            visits: userVisits.length,
            completed: userVisits.filter((visit) => visit.status === 'completed').length,
            pipelineUsd,
            status: buildStatus(userVisits, outcomesByVisitId),
          };
        }

        const userVisits = scopedVisits.filter((visit) => visit.assigned_am?._id === user._id);
        const userVisitIds = new Set(userVisits.map((visit) => visit._id));
        const pipelineUsd = outcomes.reduce((sum, outcome) => {
          if (!outcome.visit?._id || !userVisitIds.has(outcome.visit._id)) return sum;
          return sum + parsePipelineValue(outcome.next_action);
        }, 0);

        return {
          userId: user._id,
          initials: getInitials(user.name),
          name: user.name,
          sector: formatMeetingGroup(user.meeting_group),
          clients: scopedClients.filter((client) => client.am?._id === user._id).length,
          visits: userVisits.length,
          completed: userVisits.filter((visit) => visit.status === 'completed').length,
          pipelineUsd,
          status: buildStatus(userVisits, outcomesByVisitId),
        };
      }).filter((row) => row.visits > 0 || row.clients > 0);
      const amRowsById = new Map(nextRows.map((row) => [row.userId, row]));

      const nextSectorRows = Array.from(scopedVisits.reduce((grouped, visit) => {
        const clientId = visit.client?._id;
        const client = clientId ? clientsById.get(clientId) : null;
        const key = client?.sector ?? 'Unassigned';
        const existing = grouped.get(key) ?? {
          key,
          label: key,
          visits: 0,
          completed: 0,
          pipelineUsd: 0,
          clientCount: 0,
          clientIds: new Set<string>(),
        };
        existing.visits += 1;
        if (visit.status === 'completed') {
          existing.completed += 1;
        }
        existing.pipelineUsd += parsePipelineValue(outcomesByVisitId.get(visit._id)?.next_action);
        if (clientId) {
          existing.clientIds.add(clientId);
        }
        existing.clientCount = existing.clientIds.size;
        grouped.set(key, existing);
        return grouped;
      }, new Map<string, SectorRow & { clientIds: Set<string> }>()).values())
        .map(({ clientIds: _clientIds, ...row }) => row)
        .sort((left, right) => right.visits - left.visits || right.pipelineUsd - left.pipelineUsd || left.label.localeCompare(right.label));

      const nextDepartmentRows = Array.from(scopedVisits.reduce((grouped, visit) => {
        const key = formatMeetingGroup(visit.meeting_group);
        const existing = grouped.get(key) ?? {
          key,
          label: key,
          visits: 0,
          completed: 0,
          pipelineUsd: 0,
          amCount: 0,
          memberIds: new Set<string>(),
        };
        existing.visits += 1;
        if (visit.status === 'completed') {
          existing.completed += 1;
        }
        existing.pipelineUsd += parsePipelineValue(outcomesByVisitId.get(visit._id)?.next_action);
        for (const member of getVisitMemberSummaries(visit, usersById, amRowsById)) {
          existing.memberIds.add(member.key);
        }
        existing.amCount = existing.memberIds.size;
        grouped.set(key, existing);
        return grouped;
      }, new Map<string, DepartmentRow & { memberIds: Set<string> }>()).values())
        .map(({ memberIds: _memberIds, ...row }) => row)
        .sort((left, right) => right.visits - left.visits || right.pipelineUsd - left.pipelineUsd || left.label.localeCompare(right.label));

      setRows(nextRows);
      setDepartmentRows(nextDepartmentRows);
      setSectorRows(nextSectorRows);
      setTeamUsers(users);
      setTeamClients(clients);
      setTeamVisits(scopedVisits);
      setError(null);
    } catch {
      setError('Could not load team report data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { void load(); }, [currentUser._id, currentUser.role, currentUser.meeting_group, viewerRole, quarterWindow.from, quarterWindow.to]);

  const sortedRows = useMemo(() => {
    const nextRows = [...rows];
    nextRows.sort((left, right) => right.visits - left.visits || right.pipelineUsd - left.pipelineUsd || left.name.localeCompare(right.name));
    return nextRows;
  }, [rows]);

  const totalVisits = sortedRows.reduce((sum, row) => sum + row.visits, 0);
  const totalCompleted = sortedRows.reduce((sum, row) => sum + row.completed, 0);
  const completionRate = totalVisits > 0 ? Math.round((totalCompleted / totalVisits) * 100) : 0;
  const totalPipeline = sortedRows.reduce((sum, row) => sum + row.pipelineUsd, 0);
  const viewTabs: Array<{ key: TeamView; label: string }> = [
    { key: 'ams', label: 'By AMs' },
    { key: 'departments', label: 'By Departments' },
    { key: 'sectors', label: 'By Sector' },
  ];

  const activeCount = viewBy === 'ams' ? sortedRows.length : viewBy === 'departments' ? departmentRows.length : sectorRows.length;
  const activeLabel = viewBy === 'ams' ? 'AMs' : viewBy === 'departments' ? 'Departments' : 'Sectors';

  const departmentDetailRows = useMemo(() => {
    if (detailSheet?.type !== 'department') return [] as DepartmentDetailRow[];
    const usersById = new Map(teamUsers.map((user) => [user._id, user]));
    const amRowsById = new Map(rows.map((row) => [row.userId, row]));
    const userVisitMap = new Map<string, { name: string; roleLabel: string; visits: Map<string, CockpitVisit> }>();

    for (const visit of teamVisits) {
      if (formatMeetingGroup(visit.meeting_group) !== detailSheet.label) continue;
      for (const member of getVisitMemberSummaries(visit, usersById, amRowsById)) {
        const bucket = userVisitMap.get(member.key) ?? {
          name: member.name,
          roleLabel: member.roleLabel,
          visits: new Map<string, CockpitVisit>(),
        };
        bucket.visits.set(visit._id, visit);
        userVisitMap.set(member.key, bucket);
      }
    }

    return Array.from(userVisitMap.entries()).map(([userId, member]) => {
      const visits = Array.from(member.visits.values());
      return {
        key: userId,
        name: member.name,
        roleLabel: member.roleLabel,
        visits: visits.length,
      };
    }).filter((row): row is DepartmentDetailRow => {
      if (!row) return false;
      return row.visits > 0;
    }).sort((left, right) => right.visits - left.visits || left.name.localeCompare(right.name));
  }, [detailSheet, rows, teamUsers, teamVisits]);

  const sectorDetailRows = useMemo(() => {
    if (detailSheet?.type !== 'sector') return [] as SectorDetailRow[];
    const usersById = new Map(teamUsers.map((user) => [user._id, user]));
    const clientsById = new Map(teamClients.map((client) => [client._id, client]));
    const clientMap = new Map<string, { key: string; clientName: string; visits: number; contributors: Map<string, ContributorSummary> }>();

    for (const visit of teamVisits) {
      const clientId = visit.client?._id;
      const client = clientId ? clientsById.get(clientId) : null;
      const sector = client?.sector ?? 'Unassigned';
      if (sector !== detailSheet.label) continue;

      const key = clientId ?? visit.title;
      const clientName = client?.name ?? visit.client?.name ?? visit.title;
      const current = clientMap.get(key) ?? { key, clientName, visits: 0, contributors: new Map<string, ContributorSummary>() };
      current.visits += 1;
      const visitMemberIds = getVisitMemberIds(visit);

      const addContributor = (userId: string, fallbackName?: string | null) => {
        if (!isNonEmptyString(userId)) return;
        const user = usersById.get(userId);
        if (user && !(user.role === 'am' || user.role === 'sales' || user.role === 'solution')) return;
        const contributor = current.contributors.get(userId) ?? {
          key: userId,
          name: user?.name ?? fallbackName ?? 'Unknown User',
          roleLabel: formatRoleLabel(user?.role),
          visits: 0,
        };
        contributor.visits += 1;
        current.contributors.set(userId, contributor);
      };

      for (const userId of visitMemberIds) {
        const fallbackName = visit.assigned_am?._id === userId
          ? visit.assigned_am?.name
          : visit.participants?.find((participant) => participant._id === userId)?.name;
        addContributor(userId, fallbackName);
      }

      clientMap.set(key, current);
    }

    return Array.from(clientMap.values()).map((row) => ({
      key: row.key,
      clientName: row.clientName,
      visits: row.visits,
      topContributors: Array.from(row.contributors.values()).sort((left, right) => right.visits - left.visits || left.name.localeCompare(right.name)).slice(0, 5),
    })).sort((left, right) => right.visits - left.visits || left.clientName.localeCompare(right.clientName));
  }, [detailSheet, teamClients, teamUsers, teamVisits]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.primary} />}
    >
      <View style={s.hero}> 
        <Pressable onPress={onBack} hitSlop={10} style={[s.backBtn, { backgroundColor: theme.surface }]}> 
          <Text style={[s.backIcon, { color: theme.text }]}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[s.eyebrow, { color: theme.textFaint }]}>Team Overview</Text>
          <Text style={[s.title, { color: theme.text }]}>Clients and AM Activity Report</Text>
          <Text style={[s.subtitle, { color: theme.textSecondary }]}> 
            {quarterWindow.quarterLabel} · {quarterWindow.subtitleLabel} · {activeCount} {activeLabel}
          </Text>
        </View>
      </View>

      <View style={s.kpiStrip}>
        <KpiCell value={String(totalVisits)} label="Visits" theme={theme} />
        <KpiCell value={`${completionRate}%`} label="Completed" theme={theme} accent={theme.success} />
        <KpiCell value={`$${(totalPipeline / 1000).toFixed(0)}K`} label="Pipeline" theme={theme} accent={theme.primary} />
      </View>

      <View style={s.tabs}>
        {viewTabs.map((tab) => {
          const active = viewBy === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setViewBy(tab.key)}
              style={[s.tab, { backgroundColor: active ? theme.primaryLight : theme.surface, borderColor: active ? theme.primary : theme.border }]}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: active ? theme.primary : theme.textSecondary, fontFamily: fonts.display }}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[s.caption, { color: theme.textSecondary }]}>{activeLabel} · {quarterWindow.quarterLabel}</Text>
      {error ? <Text style={{ color: theme.error, textAlign: 'center', marginHorizontal: 16, marginBottom: 12 }}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: 32 }} />
      ) : viewBy === 'ams' && sortedRows.length === 0 ? (
        <Card style={{ marginHorizontal: 16, alignItems: 'center', paddingVertical: 20 }}>
          <Text style={{ fontSize: 14, color: theme.textSecondary }}>No Cockpit team data found for this quarter.</Text>
        </Card>
      ) : viewBy === 'departments' && departmentRows.length === 0 ? (
        <Card style={{ marginHorizontal: 16, alignItems: 'center', paddingVertical: 20 }}>
          <Text style={{ fontSize: 14, color: theme.textSecondary }}>No department activity found for this quarter.</Text>
        </Card>
      ) : viewBy === 'sectors' && sectorRows.length === 0 ? (
        <Card style={{ marginHorizontal: 16, alignItems: 'center', paddingVertical: 20 }}>
          <Text style={{ fontSize: 14, color: theme.textSecondary }}>No sector activity found for this quarter.</Text>
        </Card>
      ) : (
        <Card style={s.card}> 
          {viewBy === 'ams' ? sortedRows.map((am, idx) => (
            <Pressable
              key={am.userId}
              onPress={() => onOpenAm(am.userId)}
              style={({ pressed }) => [
                s.amRow,
                idx < sortedRows.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.divider },
                pressed && { opacity: 0.6 },
              ]}
            >
              <View style={[s.amAvatar, { backgroundColor: theme.primaryLight }]}> 
                <Text style={[s.amAvatarText, { color: theme.primary }]}>{am.initials}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[s.amName, { color: theme.text }]}>{am.name}</Text>
                <View style={{ flexDirection: 'row', gap: 4, marginTop: 2 }}>
                  <Badge tone="muted">{am.sector}</Badge>
                  <Badge tone="teal">{am.clients} clients</Badge>
                </View>
                <Text style={[s.amStatus, { color: TONE_COLOR[am.status.tone] }]}> 
                  {am.status.emoji} {am.status.text}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[s.amVisits, { color: theme.text }]}>{am.visits}</Text>
                <Text style={[s.amPipe, { color: theme.textSecondary }]}> 
                  visits · ${(am.pipelineUsd / 1000).toFixed(0)}K
                </Text>
              </View>
              <Text style={[s.chev, { color: theme.textFaint }]}>›</Text>
            </Pressable>
          )) : null}

          {viewBy === 'departments' ? departmentRows.map((department, idx) => (
            <Pressable
              key={department.key}
              onPress={() => setDetailSheet({ type: 'department', label: department.label })}
              style={({ pressed }) => [
                s.amRow,
                idx < departmentRows.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.divider },
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={[s.amAvatar, { backgroundColor: theme.primaryLight }]}> 
                <Text style={[s.amAvatarText, { color: theme.primary }]}>{getInitials(department.label)}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[s.amName, { color: theme.text }]}>{department.label}</Text>
                <View style={{ flexDirection: 'row', gap: 4, marginTop: 2 }}>
                  <Badge tone="teal">{department.amCount} members</Badge>
                  <Badge tone="muted">{department.completed} completed</Badge>
                </View>
                <Text style={[s.amStatus, { color: theme.textSecondary }]}>Total department visits for the quarter</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[s.amVisits, { color: theme.text }]}>{department.visits}</Text>
                <Text style={[s.amPipe, { color: theme.textSecondary }]}>visits · ${(department.pipelineUsd / 1000).toFixed(0)}K</Text>
              </View>
              <Text style={[s.chev, { color: theme.textFaint }]}>›</Text>
            </Pressable>
          )) : null}

          {viewBy === 'sectors' ? sectorRows.map((sector, idx) => (
            <Pressable
              key={sector.key}
              onPress={() => setDetailSheet({ type: 'sector', label: sector.label })}
              style={({ pressed }) => [
                s.amRow,
                idx < sectorRows.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.divider },
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={[s.amAvatar, { backgroundColor: theme.primaryLight }]}> 
                <Text style={[s.amAvatarText, { color: theme.primary }]}>{getInitials(sector.label)}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[s.amName, { color: theme.text }]}>{sector.label}</Text>
                <View style={{ flexDirection: 'row', gap: 4, marginTop: 2 }}>
                  <Badge tone="teal">{sector.clientCount} clients</Badge>
                  <Badge tone="muted">{sector.completed} completed</Badge>
                </View>
                <Text style={[s.amStatus, { color: theme.textSecondary }]}>Total sector visits for the quarter</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[s.amVisits, { color: theme.text }]}>{sector.visits}</Text>
                <Text style={[s.amPipe, { color: theme.textSecondary }]}>visits · ${(sector.pipelineUsd / 1000).toFixed(0)}K</Text>
              </View>
              <Text style={[s.chev, { color: theme.textFaint }]}>›</Text>
            </Pressable>
          )) : null}
        </Card>
      )}

      {viewBy === 'ams' ? (
        <Text style={[s.footnote, { color: theme.textSecondary }]}> 
          Tap an AM to see their Q2 visit list
        </Text>
      ) : null}

      <Modal visible={detailSheet !== null} transparent animationType="fade" onRequestClose={() => setDetailSheet(null)}>
        <Pressable style={s.modalOverlay} onPress={() => setDetailSheet(null)}>
          <Pressable style={[s.modalSheet, { backgroundColor: theme.bg, borderColor: theme.border }]} onPress={() => {}}>
            <View style={s.modalEyebrowRow}>
              <Text style={[s.modalEyebrow, { color: theme.textFaint }]}>
                {detailSheet?.type === 'department' ? 'Department Breakdown' : 'Sector Breakdown'}
              </Text>
            </View>
            <View style={s.modalHeader}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={[s.modalTitle, { color: theme.text }]}> 
                {detailSheet?.type === 'department' ? `${detailSheet.label} Team` : `${detailSheet?.label ?? ''} Clients`}
                </Text>
                <Text style={[s.modalSubtitle, { color: theme.textSecondary }]}>
                  {detailSheet?.type === 'department'
                    ? 'Visit owners and contributors with their total visits this quarter'
                    : 'Clients in this sector with the top contributors for the quarter'}
                </Text>
              </View>
              <Pressable onPress={() => setDetailSheet(null)} hitSlop={10} style={[s.modalClose, { backgroundColor: theme.surfaceOffset }]}>
                <Text style={{ color: theme.textSecondary, fontSize: 18 }}>×</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28 }}>
              {detailSheet?.type === 'department'
                ? departmentDetailRows.map((row) => (
                    <Card key={row.key} style={s.detailCard}>
                      <View style={s.detailHeaderRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.detailTitle, { color: theme.text }]}>{row.name}</Text>
                          <Text style={[s.detailMeta, { color: theme.textSecondary }]}>{row.roleLabel} · {row.visits} visits</Text>
                        </View>
                        <View style={[s.metricPill, { backgroundColor: theme.primaryLight }]}>
                          <Text style={[s.metricPillText, { color: theme.primary }]}>{row.visits}</Text>
                        </View>
                      </View>
                    </Card>
                  ))
                : null}
              {detailSheet?.type === 'sector'
                ? sectorDetailRows.map((row) => (
                    <Card key={row.key} style={s.detailCard}>
                      <View style={s.detailHeaderRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.detailTitle, { color: theme.text }]}>{row.clientName}</Text>
                          <Text style={[s.detailMeta, { color: theme.textSecondary }]}>{row.visits} visits</Text>
                        </View>
                        <View style={[s.metricPill, { backgroundColor: theme.primaryLight }]}>
                          <Text style={[s.metricPillText, { color: theme.primary }]}>{row.visits}</Text>
                        </View>
                      </View>
                      {row.topContributors.map((contributor) => (
                        <View key={contributor.key} style={s.detailSubRow}>
                          <Text style={[s.detailSubTitle, { color: theme.text }]}>{contributor.name}</Text>
                          <Text style={[s.detailSubMeta, { color: theme.textSecondary }]}>{contributor.roleLabel} · {contributor.visits} visits</Text>
                        </View>
                      ))}
                    </Card>
                  ))
                : null}
              {detailSheet?.type === 'department' && departmentDetailRows.length === 0 ? <Text style={[s.emptyDetail, { color: theme.textSecondary }]}>No user visit activity found for this department.</Text> : null}
              {detailSheet?.type === 'sector' && sectorDetailRows.length === 0 ? <Text style={[s.emptyDetail, { color: theme.textSecondary }]}>No client visit activity found for this sector.</Text> : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function KpiCell({ value, label, theme, accent }: { value: string; label: string; theme: any; accent?: string }) {
  return (
    <Card style={s.kpi}> 
      <Text style={[s.kpiVal, { color: accent || theme.text }]}>{value}</Text>
      <Text style={[s.kpiLbl, { color: theme.textSecondary }]}>{label}</Text>
    </Card>
  );
}

const s = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingTop: 18, gap: 12 },
  backBtn: { padding: 8, borderRadius: radii.full },
  backIcon: { fontSize: 24, fontWeight: '300' },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { fontSize: 24, fontWeight: '700', fontFamily: fonts.display },
  subtitle: { fontSize: 12, marginTop: 4 },
  kpiStrip: { flexDirection: 'row', gap: 8, padding: 12 },
  kpi: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  kpiVal: { fontSize: 18, fontWeight: '700', fontFamily: fonts.display },
  kpiLbl: { fontSize: 10, marginTop: 2 },
  tabs: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingBottom: 8 },
  tab: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radii.full, borderWidth: 1 },
  caption: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 6,
  },
  card: { marginHorizontal: 16, borderRadius: radii.lg, overflow: 'hidden', padding: 0 },
  amRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },
  amAvatar: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amAvatarText: { fontSize: 12, fontWeight: '700', fontFamily: fonts.display },
  amName: { fontSize: 13, fontWeight: '700', fontFamily: fonts.display },
  amStatus: { fontSize: 10, fontWeight: '600', marginTop: 3 },
  amVisits: { fontSize: 16, fontWeight: '700', fontFamily: fonts.display },
  amPipe: { fontSize: 9 },
  chev: { fontSize: 18, marginLeft: 4 },
  footnote: { fontSize: 10, textAlign: 'center', paddingVertical: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalSheet: {
    width: '100%',
    maxWidth: 720,
    maxHeight: '78%',
    borderRadius: radii.xl,
    borderWidth: 1,
    paddingTop: 14,
    shadowColor: '#020617',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  modalEyebrowRow: { paddingHorizontal: 16, paddingBottom: 4 },
  modalEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 16, paddingBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', fontFamily: fonts.display },
  modalSubtitle: { fontSize: 12, marginTop: 4, lineHeight: 18 },
  modalClose: { width: 28, height: 28, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center' },
  detailCard: { marginBottom: 10, padding: 12, borderRadius: radii.lg },
  detailHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  detailTitle: { fontSize: 14, fontWeight: '700', fontFamily: fonts.display },
  detailMeta: { fontSize: 11 },
  metricPill: { minWidth: 34, height: 28, paddingHorizontal: 10, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center' },
  metricPillText: { fontSize: 12, fontWeight: '700', fontFamily: fonts.display },
  detailSubRow: { paddingTop: 8, paddingBottom: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(148,163,184,0.22)' },
  detailSubTitle: { fontSize: 13, fontWeight: '600' },
  detailSubMeta: { fontSize: 11, marginTop: 2 },
  emptyDetail: { textAlign: 'center', paddingVertical: 24, fontSize: 13 },
});
