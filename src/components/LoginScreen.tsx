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
  | 'pending_approval'
  | 'inactive'
  | 'error';

export function LoginScreen({
  status,
  loginReady,
  error,
  onLogin,
}: {
  status: AuthStatus;
  loginReady: boolean;
  error: string | null;
  onLogin: () => void;
}) {
  const isLoading = status === 'restoring' || status === 'signing_in';
  const isBlocked = status === 'pending_approval' || status === 'inactive';

  const banner: BannerState | null =
    status === 'pending_approval'
      ? { tone: 'info', message: 'Your account request has been submitted. An admin will review it soon.' }
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

          <Pressable
            disabled={isLoading || !loginReady || isBlocked}
            onPress={onLogin}
            style={({ pressed }) => [
              styles.primaryButton,
              styles.msButton,
              pressed && !isLoading ? styles.primaryButtonPressed : null,
              (isLoading || !loginReady || isBlocked) ? styles.buttonDisabled : null,
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

          {status === 'restoring' ? (
            <Text style={styles.loginHint}>Restoring session…</Text>
          ) : status === 'signing_in' ? (
            <Text style={styles.loginHint}>Opening Microsoft login…</Text>
          ) : status === 'pending_approval' ? (
            <Text style={styles.loginHint}>You will be notified once your account is approved.</Text>
          ) : (
            <Text style={styles.loginHint}>
              {'Use your @bimats.com work account.\nContact your admin if you don\'t have access.'}
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