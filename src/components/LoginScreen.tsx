import React from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { Banner } from './Banner';
import { styles } from '../styles';

type BannerState = {
  tone: 'error' | 'success' | 'info';
  message: string;
};

type AuthStatus =
  | 'restoring'
  | 'unauthenticated'
  | 'signing_in'
  | 'authenticated'
  | 'not_registered'
  | 'inactive'
  | 'error';

export function LoginScreen({
  status,
  loginReady,
  error,
  onLogin,
  pendingEmail,
  pendingName,
  onCreateAccount,
  createAccountLoading,
}: {
  status: AuthStatus;
  loginReady: boolean;
  error: string | null;
  onLogin: () => void;
  pendingEmail?: string;
  pendingName?: string;
  onCreateAccount?: () => void;
  createAccountLoading?: boolean;
}) {
  const isLoading = status === 'restoring' || status === 'signing_in' || (status === 'not_registered' && createAccountLoading);

  const banner: BannerState | null =
    status === 'not_registered'
      ? { tone: 'info', message: `Ready to create account for ${pendingName} (${pendingEmail})?` }
      : status === 'inactive'
      ? { tone: 'error', message: 'Your account has been deactivated. Contact your admin.' }
      : status === 'error' && error
      ? { tone: 'error', message: error }
      : null;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.loginShell}>
      <View style={styles.screenBackdrop} pointerEvents="none">
        <View style={[styles.backgroundOrb, styles.backgroundOrbTop]} />
        <View style={[styles.backgroundOrb, styles.backgroundOrbMiddle]} />
        <View style={[styles.backgroundOrb, styles.backgroundOrbBottom]} />
      </View>

      <View style={styles.loginPanel}>
        <View style={styles.loginCard}>
          <Text style={styles.eyebrow}>BIM CRM</Text>
          <Text style={styles.loginTitle}>Visitplan Workspace</Text>
          <Text style={styles.loginSubtitle}>
            Sign in with your BIM Microsoft work account to access the visit plan workspace.
          </Text>

          {banner ? <Banner banner={banner} /> : null}

          {status === 'not_registered' ? (
            <Pressable
              disabled={isLoading}
              onPress={onCreateAccount}
              style={({ pressed }) => [
                styles.primaryButton,
                styles.msButton,
                pressed && !isLoading ? styles.primaryButtonPressed : null,
                isLoading ? styles.buttonDisabled : null,
              ]}
            >
              {createAccountLoading ? (
                <ActivityIndicator color="#F8FAFC" />
              ) : (
                <Text style={styles.primaryButtonText}>Create Account</Text>
              )}
            </Pressable>
          ) : (
            <Pressable
              disabled={isLoading || !loginReady}
              onPress={onLogin}
              style={({ pressed }) => [
                styles.primaryButton,
                styles.msButton,
                pressed && !isLoading ? styles.primaryButtonPressed : null,
                (isLoading || !loginReady) ? styles.buttonDisabled : null,
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="#F8FAFC" />
              ) : (
                <View style={styles.msButtonInner}>
                  <MicrosoftLogo />
                  <Text style={styles.primaryButtonText}>Sign in with Microsoft</Text>
                </View>
              )}
            </Pressable>
          )}

          {status === 'restoring' ? (
            <Text style={styles.loginHint}>Restoring session…</Text>
          ) : status === 'signing_in' ? (
            <Text style={styles.loginHint}>Opening Microsoft login…</Text>
          ) : status === 'not_registered' ? (
            <Text style={styles.loginHint}>Creating a new account…</Text>
          ) : (
            <Text style={styles.loginHint}>
              Use your @bimats.com work account.{'\n'}Contact your admin if you don't have access.
            </Text>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// Inline Microsoft "⊞" logo — no external image dependency
function MicrosoftLogo() {
  return (
    <View style={styles.msLogo}>
      <View style={[styles.msLogoQuad, { backgroundColor: '#F25022' }]} />
      <View style={[styles.msLogoQuad, { backgroundColor: '#7FBA00' }]} />
      <View style={[styles.msLogoQuad, { backgroundColor: '#00A4EF' }]} />
      <View style={[styles.msLogoQuad, { backgroundColor: '#FFB900' }]} />
    </View>
  );
}