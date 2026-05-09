import React from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useTheme, fonts, radii } from '../context/ThemeContext';
import { Card, Icon, PrimaryButton } from './ui';

type AuthStatus =
  | 'restoring' | 'unauthenticated' | 'signing_in' | 'authenticated'
  | 'pending_approval' | 'inactive' | 'error';

export function LoginScreen({
  status, loginReady, error, onLogin,
}: {
  status: AuthStatus;
  loginReady: boolean;
  error: string | null;
  onLogin: () => void;
}) {
  const { theme } = useTheme();
  const isLoading = status === 'restoring' || status === 'signing_in';
  const isBlocked = status === 'pending_approval' || status === 'inactive';

  const banner =
    status === 'pending_approval'
      ? { tone: 'info' as const, message: 'Your account request has been submitted. An admin will review it soon.' }
      : status === 'inactive'
      ? { tone: 'error' as const, message: 'Your account has been deactivated. Contact your admin.' }
      : status === 'error' && error
      ? { tone: 'error' as const, message: error }
      : null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: theme.bg }}
    >
      {/* Background gradient stack */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
        <View style={{ flex: 1, backgroundColor: theme.loginBgFrom ?? theme.bg }} />
        <View style={{ flex: 1, backgroundColor: theme.loginBgVia ?? theme.bg }} />
        <View style={{ flex: 1, backgroundColor: theme.loginBgTo ?? theme.bg }} />
        {/* Soft accent orb */}
        <View style={{
          position: 'absolute', top: -80, right: -80, width: 240, height: 240,
          borderRadius: 120, backgroundColor: theme.primary, opacity: 0.08,
        }} />
        <View style={{
          position: 'absolute', bottom: -60, left: -60, width: 200, height: 200,
          borderRadius: 100, backgroundColor: theme.primary, opacity: 0.05,
        }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1, justifyContent: 'center', alignItems: 'center',
          paddingHorizontal: 24, paddingVertical: 48,
        }}
      >
        <View style={{ width: '100%', maxWidth: 380, alignItems: 'center' }}>
          {/* Brand mark */}
          <View style={{
            width: 56, height: 56, borderRadius: radii.lg,
            backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center',
            marginBottom: 18,
            shadowColor: theme.primary, shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
          }}>
            <Icon.BrandMark size={32} color="#fff" />
          </View>

          {/* Wordmark */}
          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 6 }}>
            <Text style={{ fontSize: 28, fontWeight: '800', color: theme.text, fontFamily: fonts.display }}>
              Visit
            </Text>
            <Text style={{ fontSize: 28, fontWeight: '800', color: theme.primary, fontFamily: fonts.display }}>
              Plan
            </Text>
          </View>

          {/* Tagline */}
          <Text style={{
            fontSize: 14, color: theme.textSecondary, marginBottom: 32, textAlign: 'center',
          }}>
            Account-based field execution
          </Text>

          {/* Sign-in card */}
          <Card style={{ width: '100%', padding: 24, alignItems: 'stretch' }}>
            <Text style={{
              fontSize: 16, fontWeight: '700', color: theme.text,
              textAlign: 'center', marginBottom: 6, fontFamily: fonts.display,
            }}>
              Welcome back
            </Text>
            <Text style={{
              fontSize: 13, color: theme.textSecondary,
              textAlign: 'center', marginBottom: 20,
            }}>
              Sign in with your Microsoft work account
            </Text>

            {banner ? (
              <View style={{
                backgroundColor: banner.tone === 'error' ? theme.errorLight : theme.primaryLight,
                padding: 12, borderRadius: radii.md, marginBottom: 16,
              }}>
                <Text style={{
                  fontSize: 12,
                  color: banner.tone === 'error' ? theme.error : theme.primary,
                  textAlign: 'center',
                }}>
                  {banner.message}
                </Text>
              </View>
            ) : null}

            <PrimaryButton
              label={isLoading ? 'Opening Microsoft…' : 'Continue with Microsoft'}
              onPress={onLogin}
              disabled={isLoading || !loginReady || isBlocked}
              icon={isLoading ? <ActivityIndicator color="#fff" size="small" /> : <Icon.Microsoft size={18} />}
            />

            <Text style={{
              fontSize: 11, color: theme.textFaint, textAlign: 'center', marginTop: 16,
            }}>
              Use your @bimgoc.com work account
            </Text>
          </Card>

          <Text style={{
            fontSize: 11, color: theme.textFaint, marginTop: 24, textAlign: 'center',
          }}>
            VisitPlan v2.4 · BIM Group Myanmar
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
