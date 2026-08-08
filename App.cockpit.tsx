import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  StatusBar as NativeStatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { useAuth } from './src/hooks/useAuth';
import type { CockpitClient, CockpitUser, CockpitVisit, CockpitVisitOutcome, UserRole } from './src/types';

import { LoginScreen } from './src/components/LoginScreen';
import PendingApprovalScreen from './src/components/PendingApprovalScreen';
import TodayDashboard from './src/components/TodayDashboard';
import VisitListScreen from './src/components/VisitListScreen';
import ClientListScreen from './src/components/ClientListScreen';
import AdminScreen from './src/components/AdminScreen';
import ReportsScreen from './src/components/ReportsScreen';
import ProfileScreen from './src/components/ProfileScreen';
import TeamReportScreen from './src/components/TeamReportScreen';
import AmVisitListScreen from './src/components/AmVisitListScreen';
import EditVisitModal, { type EditVisitContext, type VisitStatus } from './src/components/EditVisitModal';
import CreateVisitModal from './src/components/CreateVisitModal';
import VisitDetailModal from './src/components/VisitDetailModal';
import ClientWorkspaceScreen from './src/components/ClientWorkspaceScreen';
import { BottomNavigation, type AppPage } from './src/components/BottomNavigation';
import { getOutcomeByVisit, upsertVisit, upsertVisitOutcome } from './src/lib/cockpit';
import { saveUserJson, saveUserRole } from './src/lib/storage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function AppShell() {
  const { theme } = useTheme();
  const { status, user, role, login, logout, loginReady, error } = useAuth();
  const [currentUser, setCurrentUser] = useState<CockpitUser | null>(null);
  const [activePage, setActivePage] = useState<AppPage>("today");
  // v2.4 sub-screens reachable from Profile or Reports → Teams
  const [adminOpen, setAdminOpen] = useState(false);
  const [teamReportOpen, setTeamReportOpen] = useState(false);
  const [amDrilldown, setAmDrilldown] = useState<string | null>(null);
  // Dev role override for web preview
  const [previewRole, setPreviewRole] = useState<UserRole | null>(null);

  // Modal state
  const [selectedVisit, setSelectedVisit] = useState<CockpitVisit | null>(null);
  const [selectedClient, setSelectedClient] = useState<CockpitClient | null>(null);
  const [showCreateVisit, setShowCreateVisit] = useState(false);
  const [createVisitForClient, setCreateVisitForClient] = useState<CockpitClient | null>(null);
  const [editVisitCtx, setEditVisitCtx] = useState<EditVisitContext | null>(null);
  const [visitDataVersion, setVisitDataVersion] = useState(0);

  useEffect(() => {
    setActivePage("today");
  }, [status]);

  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  const handleUserUpdated = (nextUser: CockpitUser) => {
    setCurrentUser(nextUser);
    void saveUserJson(nextUser);
    void saveUserRole(nextUser.role);
  };

  const handleNavigate = (page: AppPage) => {
    setActivePage(page);
    setAdminOpen(false);
    setTeamReportOpen(false);
    setAmDrilldown(null);
  };

  const statusBarStyle = theme.bg === "#F8FAFC" ? "dark" : "light";
  const topInset = Platform.OS === "ios" ? 44 : (NativeStatusBar.currentHeight ?? 24);

  if (status === "restoring") {
    return (
      <View style={[s.center, { backgroundColor: theme.bg }]}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  if (
    status === "unauthenticated" ||
    status === "signing_in" ||
    status === "inactive" ||
    status === "error"
  ) {
    return (
      <>
        <StatusBar style={statusBarStyle} />
        <LoginScreen
          status={status}
          loginReady={loginReady}
          error={error}
          onLogin={login}
        />
      </>
    );
  }

  if (status === "pending_approval") {
    return (
      <>
        <StatusBar style={statusBarStyle} />
        <PendingApprovalScreen onLogout={logout} />
      </>
    );
  }

  if (status !== "authenticated" || !user) {
    return (
      <View style={[s.center, { backgroundColor: theme.bg }]}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  const effectiveUser = currentUser ?? user;

  const parsePipelineValue = (nextAction?: string | null) => {
    if (!nextAction) return '';
    const match = nextAction.match(/pipeline value:\s*usd\s*([\d,]+)/i);
    return match?.[1]?.replace(/,/g, '') ?? '';
  };

  const toEditCtx = (v: CockpitVisit, outcome?: CockpitVisitOutcome | null): EditVisitContext => {
    const status: VisitStatus =
      v.status === 'completed' ? 'done'
      : v.status === 'in_progress' ? 'active'
      : v.status === 'missed' ? 'noshow'
      : 'planned';
    return {
      id: v._id,
      client: v.client?.name ?? v.title ?? '—',
      date: v.date ?? '',
      time: (v.start_time ?? '').slice(0, 5),
      status,
      initialOutcome:
        outcome?.result === 'positive' || outcome?.result === 'neutral' || outcome?.result === 'negative'
          ? outcome.result
          : 'pending',
      initialPipelineUsd: parsePipelineValue(outcome?.next_action),
      initialNotes: outcome?.summary ?? '',
    };
  };

  const openEditVisit = async (visit: CockpitVisit) => {
    const outcome = await getOutcomeByVisit(visit._id);
    setEditVisitCtx(toEditCtx(visit, outcome));
  };

  const currentRole: UserRole = previewRole ?? (role ?? "am");
  const isMgmt = currentRole === "admin" || currentRole === "management";

  // Sub-screen overlays take priority over the active page content.
  const showAdmin = adminOpen && isMgmt;
  const showAmDrill = amDrilldown !== null && isMgmt;
  const showTeamReport = teamReportOpen && isMgmt && !showAmDrill;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.bg }]}>
      <StatusBar style={statusBarStyle} />
      <View style={[s.content, { paddingTop: Platform.OS === "android" ? topInset : 0 }]}>
        <View style={{ flex: 1 }}>
          {showAmDrill ? (
            <AmVisitListScreen
              amUserId={amDrilldown!}
              onBack={() => setAmDrilldown(null)}
            />
          ) : showTeamReport ? (
            <TeamReportScreen
              currentUser={effectiveUser}
              viewerRole={currentRole}
              onBack={() => setTeamReportOpen(false)}
              onOpenAm={(k) => setAmDrilldown(k)}
            />
          ) : showAdmin ? (
            <AdminScreen currentUser={effectiveUser} onBack={() => setAdminOpen(false)} />
          ) : (
            <>
              {activePage === "today" && (
                <TodayDashboard
                  key={`today-${visitDataVersion}`}
                  user={effectiveUser}
                  onOpenVisit={setSelectedVisit}
                  onAddVisit={() => setShowCreateVisit(true)}
                  onEditVisit={(v) => { void openEditVisit(v); }}
                  onOpenPlan={() => setActivePage("visits")}
                />
              )}
              {activePage === "visits" && (
                <VisitListScreen
                  key={`visits-${visitDataVersion}`}
                  user={effectiveUser}
                  onOpenVisit={setSelectedVisit}
                  onAddVisit={() => setShowCreateVisit(true)}
                  onEditVisit={(v) => { void openEditVisit(v); }}
                />
              )}
              {activePage === "clients" && (
                <ClientListScreen
                  key={`clients-${visitDataVersion}`}
                  user={effectiveUser}
                  onOpenClient={setSelectedClient}
                />
              )}
              {activePage === "reports" && (
                <ReportsScreen
                  key={`reports-${visitDataVersion}`}
                  user={effectiveUser}
                  role={currentRole}
                  onOpenTeamReport={() => setTeamReportOpen(true)}
                />
              )}
              {activePage === "profile" && (
                <ProfileScreen
                  user={effectiveUser}
                  role={currentRole}
                  onOpenAdmin={() => setAdminOpen(true)}
                  onOpenTeamOverview={() => {
                    setActivePage("reports");
                    setTeamReportOpen(true);
                  }}
                  onLogout={logout}
                  onSwitchRole={(r: UserRole) => setPreviewRole(r)}
                  onUserUpdated={handleUserUpdated}
                />
              )}
            </>
          )}
        </View>
      </View>
      <BottomNavigation
        activePage={activePage}
        onChangePage={handleNavigate}
        role={currentRole}
      />

      <CreateVisitModal
        visible={showCreateVisit}
        user={effectiveUser}
        onClose={() => { setShowCreateVisit(false); setCreateVisitForClient(null); }}
        onSaved={() => {
          setShowCreateVisit(false);
          setCreateVisitForClient(null);
          setVisitDataVersion((current) => current + 1);
        }}
        preselectedClient={createVisitForClient}
      />
      <VisitDetailModal
        visible={selectedVisit !== null}
        visit={selectedVisit}
        user={effectiveUser}
        onClose={() => setSelectedVisit(null)}
        onUpdated={() => {
          setSelectedVisit(null);
          setVisitDataVersion((current) => current + 1);
        }}
      />
      <ClientWorkspaceScreen
        key={`workspace-${selectedClient?._id ?? 'none'}-${visitDataVersion}`}
        visible={selectedClient !== null}
        client={selectedClient}
        user={effectiveUser}
        onClose={() => setSelectedClient(null)}
        onOpenVisit={setSelectedVisit}
        onAddVisit={(c) => {
          setSelectedClient(null);
          setCreateVisitForClient(c);
          setShowCreateVisit(true);
        }}
        onClientUpdated={(updatedClient) => {
          setSelectedClient(updatedClient);
          setVisitDataVersion((current) => current + 1);
        }}
      />
      <EditVisitModal
        visible={editVisitCtx !== null}
        visit={editVisitCtx}
        onClose={() => setEditVisitCtx(null)}
        onSave={async (patch) => {
          if (!editVisitCtx) return;

          const nextStatus =
            patch.status === 'done' ? 'completed'
            : patch.status === 'active' ? 'in_progress'
            : patch.status === 'noshow' || patch.status === 'cancelled' ? 'missed'
            : 'scheduled';

          try {
            await upsertVisit({
              _id: patch.id,
              status: nextStatus,
              date: patch.status === 'rescheduled' ? patch.rescheduleDate || editVisitCtx.date : undefined,
              start_time: patch.status === 'rescheduled' ? patch.rescheduleTime || editVisitCtx.time : undefined,
            });

            const hasOutcomePayload =
              patch.outcome !== 'pending'
              || !!patch.notes.trim()
              || !!patch.pipelineUsd.trim()
              || (patch.status === 'rescheduled' && !!patch.rescheduleDate);

            if (hasOutcomePayload) {
              const existingOutcome = await getOutcomeByVisit(patch.id);
              await upsertVisitOutcome({
                _id: existingOutcome?._id,
                visit: { _id: patch.id, title: editVisitCtx.client },
                result: patch.outcome === 'pending' ? 'neutral' : patch.outcome,
                summary: patch.notes.trim() || undefined,
                next_action: patch.pipelineUsd.trim() ? `Pipeline value: USD ${patch.pipelineUsd.trim()}` : undefined,
                next_visit_date: patch.status === 'rescheduled' ? patch.rescheduleDate || undefined : undefined,
                submitted_by: { _id: effectiveUser._id, name: effectiveUser.name },
                submitted_at: new Date().toISOString(),
              });
            }

            setEditVisitCtx(null);
            setVisitDataVersion((current) => current + 1);
          } catch {
            Alert.alert('Error', 'Could not save visit changes. Please try again.');
          }
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1 },
});

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AppShell />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
