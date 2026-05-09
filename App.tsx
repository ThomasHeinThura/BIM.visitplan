import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import type { CockpitClient, CockpitVisit } from './src/types';

import { LoginScreen } from './src/components/LoginScreen';
import PendingApprovalScreen from './src/components/PendingApprovalScreen';
import TodayDashboard from './src/components/TodayDashboard';
import VisitListScreen from './src/components/VisitListScreen';
import ClientListScreen from './src/components/ClientListScreen';
import AdminScreen from './src/components/AdminScreen';
import TeamOverviewScreen from './src/components/TeamOverviewScreen';
import ReportsScreen from './src/components/ReportsScreen';
import { AppHeader } from './src/components/AppHeader';
import CreateVisitModal from './src/components/CreateVisitModal';
import VisitDetailModal from './src/components/VisitDetailModal';
import ClientWorkspaceScreen from './src/components/ClientWorkspaceScreen';
import { BottomNavigation, type AppPage } from './src/components/BottomNavigation';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function AppShell() {
  const { theme } = useTheme();
  const { status, user, role, login, logout, loginReady, error } = useAuth();
  const [activePage, setActivePage] = useState<AppPage>("today");

  // Modal state
  const [selectedVisit, setSelectedVisit] = useState<CockpitVisit | null>(null);
  const [selectedClient, setSelectedClient] = useState<CockpitClient | null>(null);
  const [showCreateVisit, setShowCreateVisit] = useState(false);
  const [createVisitForClient, setCreateVisitForClient] = useState<CockpitClient | null>(null);

  useEffect(() => {
    setActivePage("today");
  }, [status]);

  const handleNavigate = (page: AppPage) => {
    if (role !== "admin" && (page === "admin" || page === "team")) return;
    setActivePage(page);
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

  const currentRole = role ?? "am";

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.bg }]}>
      <StatusBar style={statusBarStyle} />
      <View style={[s.content, { paddingTop: Platform.OS === "android" ? topInset : 0 }]}>
        <AppHeader
          userName={user.name}
          onLogout={logout}
        />
        <View style={{ flex: 1 }}>
          {activePage === "today" && (
            <TodayDashboard
              user={user}
              onOpenVisit={setSelectedVisit}
              onAddVisit={() => setShowCreateVisit(true)}
            />
          )}
          {activePage === "visits" && (
            <VisitListScreen
              user={user}
              onOpenVisit={setSelectedVisit}
              onAddVisit={() => setShowCreateVisit(true)}
            />
          )}
          {activePage === "clients" && (
            <ClientListScreen
              user={user}
              onOpenClient={setSelectedClient}
            />
          )}
          {activePage === "admin" && currentRole === "admin" && (
            <AdminScreen currentUser={user} />
          )}
          {activePage === "team" && currentRole === "admin" && (
            <TeamOverviewScreen currentUser={user} />
          )}
          {activePage === "reports" && (
            <ReportsScreen user={user} />
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
        user={user}
        onClose={() => { setShowCreateVisit(false); setCreateVisitForClient(null); }}
        onSaved={() => { setShowCreateVisit(false); setCreateVisitForClient(null); }}
        preselectedClient={createVisitForClient}
      />
      <VisitDetailModal
        visible={selectedVisit !== null}
        visit={selectedVisit}
        user={user}
        onClose={() => setSelectedVisit(null)}
        onUpdated={() => setSelectedVisit(null)}
      />
      <ClientWorkspaceScreen
        visible={selectedClient !== null}
        client={selectedClient}
        user={user}
        onClose={() => setSelectedClient(null)}
        onOpenVisit={setSelectedVisit}
        onAddVisit={(c) => { setCreateVisitForClient(c); setShowCreateVisit(true); }}
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
