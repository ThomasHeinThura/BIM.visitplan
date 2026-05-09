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

import { LoginScreen } from './src/components/LoginScreen';
import PendingApprovalScreen from './src/components/PendingApprovalScreen';
import TodayDashboard from './src/components/TodayDashboard';
import ClientListScreen from './src/components/ClientListScreen';
import AdminScreen from './src/components/AdminScreen';
import TeamOverviewScreen from './src/components/TeamOverviewScreen';
import ReportsScreen from './src/components/ReportsScreen';
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
        {activePage === "today" && <TodayDashboard user={user} />}
        {activePage === "visits" && <TodayDashboard user={user} />}
        {activePage === "clients" && (
          <ClientListScreen user={user} />
        )}
        {activePage === "admin" && currentRole === "admin" && (
          <AdminScreen currentUser={user} />
        )}
        {activePage === "team" && currentRole === "admin" && (
          <TeamOverviewScreen currentUser={user} />
        )}
        {activePage === "reports" && currentRole !== "admin" && (
          <ReportsScreen user={user} />
        )}
      </View>
      <BottomNavigation
        activePage={activePage}
        onChangePage={handleNavigate}
        role={currentRole}
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
