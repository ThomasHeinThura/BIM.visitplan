/**
 * Slice 0 walking skeleton.
 *
 * Its only job is to prove the whole vertical works end to end: mobile web →
 * bim-crm API → Sanctum token → authorized request → rendered permissions. Once
 * the domain endpoints land (Slice 1 onward) this is replaced by the real
 * dashboard; until then it is the screen that tells you whether the connection
 * is actually wired up, rather than making you guess.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CRM_API_URL } from '../config';
import { CrmApiError } from '../lib/crm/client';
import { CrmUser, fetchMe, isPendingApproval, signInWithDevRole, signOut } from '../lib/crm/auth';

const DEV_ROLES = [
  'superadmin',
  'management',
  'sector_head',
  'account_manager',
  'sales_exec',
  'consultant',
  'employee',
];

export default function CrmSignInScreen() {
  const [user, setUser] = useState<CrmUser | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Restore an existing session on mount so a page refresh does not force a
  // re-login — the token outlives the page.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const me = await fetchMe();
        if (!cancelled) setUser(me);
      } catch {
        // No usable session. Not an error worth showing — the sign-in controls
        // below are the expected next step.
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSignIn = useCallback(async (role: string) => {
    setBusy(true);
    setError(null);

    try {
      setUser(await signInWithDevRole(role));
    } catch (e) {
      setError(
        e instanceof CrmApiError
          ? e.message
          : 'Something went wrong signing in.',
      );
    } finally {
      setBusy(false);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    setBusy(true);
    await signOut();
    setUser(null);
    setBusy(false);
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>BIM VisitPlan</Text>
      <Text style={styles.subtitle}>Slice 0 — CRM connection check</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Backend</Text>
        <Text style={styles.mono}>{CRM_API_URL || '(EXPO_PUBLIC_CRM_API_URL is not set)'}</Text>
      </View>

      {busy ? <ActivityIndicator style={styles.spinner} /> : null}

      {error ? (
        <View style={[styles.card, styles.errorCard]}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {user ? (
        <>
          <View style={[styles.card, styles.okCard]}>
            <Text style={styles.ok}>Connected</Text>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.mono}>{user.email}</Text>
          </View>

          {isPendingApproval(user) ? (
            <View style={[styles.card, styles.warnCard]}>
              <Text style={styles.warnTitle}>Pending approval</Text>
              <Text style={styles.warnBody}>
                Your account has no role assigned yet, so there is nothing to show. Ask an
                administrator to assign you a role.
              </Text>
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.label}>Roles</Text>
            <Text style={styles.body}>{user.roles.join(', ') || '—'}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Sectors</Text>
            <Text style={styles.body}>
              {user.sectors.map((s) => s.name).join(', ') || '—'}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Permissions ({user.permissions.length})</Text>
            <Text style={styles.permissions}>{user.permissions.join('\n') || '—'}</Text>
          </View>

          <Pressable style={[styles.button, styles.secondary]} onPress={handleSignOut}>
            <Text style={styles.secondaryText}>Sign out</Text>
          </Pressable>
        </>
      ) : (
        <View style={styles.card}>
          <Text style={styles.label}>Sign in as (local development only)</Text>
          <Text style={styles.hint}>
            Uses the CRM&apos;s local bypass. Requires the backend to run with
            APP_ENV=local and AUTH_BYPASS_ENABLED=true; it 404s anywhere else.
            Real sign-in uses Microsoft Entra once the mobile app registration exists.
          </Text>

          {DEV_ROLES.map((role) => (
            <Pressable key={role} style={styles.button} onPress={() => handleSignIn(role)}>
              <Text style={styles.buttonText}>{role}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingTop: 60, gap: 12, maxWidth: 520, width: '100%', alignSelf: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 8 },
  card: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 16, gap: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  okCard: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  errorCard: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  warnCard: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', color: '#64748b', letterSpacing: 0.5 },
  body: { fontSize: 15, color: '#0f172a' },
  name: { fontSize: 18, fontWeight: '600', color: '#0f172a' },
  mono: { fontSize: 13, fontFamily: 'Courier', color: '#334155' },
  permissions: { fontSize: 12, fontFamily: 'Courier', color: '#334155', lineHeight: 18 },
  ok: { fontSize: 12, fontWeight: '700', color: '#15803d', textTransform: 'uppercase', letterSpacing: 0.5 },
  errorText: { fontSize: 14, color: '#b91c1c' },
  warnTitle: { fontSize: 15, fontWeight: '600', color: '#92400e' },
  warnBody: { fontSize: 14, color: '#92400e' },
  hint: { fontSize: 12, color: '#64748b', marginBottom: 6, lineHeight: 17 },
  spinner: { marginVertical: 8 },
  button: { backgroundColor: '#0f172a', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  buttonText: { color: '#ffffff', fontWeight: '600', fontSize: 15 },
  secondary: { backgroundColor: '#e2e8f0' },
  secondaryText: { color: '#0f172a', fontWeight: '600', fontSize: 15 },
});
