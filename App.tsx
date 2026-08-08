/**
 * Application entry.
 *
 * Owns the session: restores a stored token on launch, then renders either sign-in or
 * the signed-in shell. Everything below AppShell assumes an authenticated user, which
 * keeps every screen free of "what if there is no session" branching.
 *
 * The Cockpit-backed entry is preserved verbatim as App.cockpit.tsx — later slices
 * re-point its remaining screens one domain at a time, and deleting it now would mean
 * rewriting them instead. It is not rendered: Cockpit is being retired.
 *
 * Navigation here is state-based. That does not hold at the full screen count, and
 * replacing it with expo-router is its own change — see
 * aidlc-docs/inception/application-design/mobile-architecture.md.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { AppShell } from './src/components/crm/AppShell';
import { SignInScreen } from './src/components/crm/SignInScreen';
import { EmptyState } from './src/components/crm/States';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import type { CrmUser } from './src/lib/crm/auth';
import { fetchMe, isPendingApproval, signOut } from './src/lib/crm/auth';

function Root() {
  const { theme, isDark } = useTheme();

  const [user, setUser] = useState<CrmUser | null>(null);
  const [restoring, setRestoring] = useState(true);

  // Restore an existing session on launch so a refresh — or reopening the app —
  // does not force a re-login. The token outlives the process.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const me = await fetchMe();
        if (!cancelled) setUser(me);
      } catch {
        // No usable session. Expected on first launch and after expiry; the sign-in
        // screen is the correct next step, not an error.
      } finally {
        if (!cancelled) setRestoring(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
    setUser(null);
  }, []);

  if (restoring) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg }}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <SignInScreen onSignedIn={setUser} />
      </SafeAreaView>
    );
  }

  // A new SSO user lands with no meaningful permissions. Saying so plainly beats
  // dropping them into a dashboard where every tile is empty and nothing explains why.
  if (isPendingApproval(user)) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon="◔"
            title="Pending approval"
            message={`Signed in as ${user.email}, but no role has been assigned yet. Ask an administrator to assign one — then sign in again.`}
            actionLabel="Sign out"
            onAction={handleSignOut}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppShell user={user} onSignOut={handleSignOut} />
    </View>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Root />
    </ThemeProvider>
  );
}
