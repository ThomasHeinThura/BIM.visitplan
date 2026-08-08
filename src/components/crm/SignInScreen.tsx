/**
 * Sign-in.
 *
 * Real sign-in is Microsoft Entra: the app runs the PKCE exchange (src/lib/auth.ts)
 * and posts the id_token to the CRM. That path is implemented and unit-tested but
 * cannot be exercised yet, because the mobile app registration does not exist. Until
 * it does, the role buttons below use the CRM's local bypass — which 404s unless the
 * backend runs with APP_ENV=local and AUTH_BYPASS_ENABLED=true.
 *
 * The dev block is deliberately conspicuous rather than tucked away: a sign-in
 * shortcut that looks like a normal feature is the kind of thing that survives to
 * production.
 */

import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { CRM_API_URL } from '../../config';
import { fonts, radii, useTheme } from '../../context/ThemeContext';
import type { CrmUser } from '../../lib/crm/auth';
import { signInWithDevRole } from '../../lib/crm/auth';
import { CrmApiError } from '../../lib/crm/client';

const DEV_ROLES = [
  'superadmin',
  'management',
  'sector_head',
  'account_manager',
  'sales_exec',
  'consultant',
  'employee',
];

export function SignInScreen({ onSignedIn }: { onSignedIn: (user: CrmUser) => void }) {
  const { theme } = useTheme();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const signIn = async (role: string) => {
    setBusy(role);
    setError(null);

    try {
      onSignedIn(await signInWithDevRole(role));
    } catch (e) {
      setError(e instanceof CrmApiError ? e.message : 'Something went wrong signing in.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{
        padding: 20,
        paddingTop: 56,
        gap: 14,
        maxWidth: 520,
        width: '100%',
        alignSelf: 'center',
      }}
    >
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 28, fontWeight: '700', color: theme.text, fontFamily: fonts.display }}>
          BIM VisitPlan
        </Text>
        <Text style={{ fontSize: 14, color: theme.textSecondary }}>Sign in to continue</Text>
      </View>

      {error ? (
        <View
          style={{
            backgroundColor: theme.errorLight,
            borderRadius: radii.md,
            padding: 14,
            borderWidth: 1,
            borderColor: theme.error,
          }}
        >
          <Text style={{ color: theme.error, fontSize: 13, lineHeight: 19 }}>{error}</Text>
        </View>
      ) : null}

      <View
        style={{
          backgroundColor: theme.warningLight,
          borderRadius: radii.lg,
          padding: 16,
          gap: 10,
          borderWidth: 1,
          borderColor: theme.warning,
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: '700', color: theme.warning, letterSpacing: 0.5 }}>
          LOCAL DEVELOPMENT SIGN-IN
        </Text>
        <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 17 }}>
          Entra sign-in is wired up but needs a mobile app registration that doesn&apos;t exist
          yet. These buttons use the CRM&apos;s local bypass and only work against a backend
          running with APP_ENV=local.
        </Text>

        {DEV_ROLES.map((role) => (
          <Pressable
            key={role}
            disabled={busy !== null}
            onPress={() => signIn(role)}
            style={({ pressed }) => [
              {
                backgroundColor: theme.surface,
                borderRadius: radii.md,
                paddingVertical: 12,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: theme.border,
                opacity: busy !== null && busy !== role ? 0.5 : 1,
              },
              pressed && { opacity: 0.75 },
            ]}
          >
            {busy === role ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Text style={{ color: theme.text, fontWeight: '600', fontSize: 14 }}>{role}</Text>
            )}
          </Pressable>
        ))}
      </View>

      <Text style={{ fontSize: 11, color: theme.textFaint, textAlign: 'center' }}>
        {CRM_API_URL || 'EXPO_PUBLIC_CRM_API_URL is not set'}
      </Text>
    </ScrollView>
  );
}
