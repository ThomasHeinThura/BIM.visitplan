import React from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useTheme, fonts, radii } from '../context/ThemeContext';
import { Icon, PrimaryButton } from './ui';

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
  const { theme, isDark } = useTheme();
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
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.loginBgVia ?? theme.bg }} pointerEvents="none">
        <View style={{
          position: 'absolute', top: -80, right: -80, width: 240, height: 240,
          borderRadius: 120, backgroundColor: theme.primary, opacity: 0.12,
        }} />
        <View style={{
          position: 'absolute', bottom: -60, left: -60, width: 200, height: 200,
          borderRadius: 100, backgroundColor: theme.primary, opacity: 0.08,
        }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: 20,
          paddingTop: 56,
          paddingBottom: 28,
        }}
      >
        <View style={{ width: '100%', maxWidth: 380, alignSelf: 'center' }}>
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <View style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              backgroundColor: theme.primary,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
              shadowColor: theme.primary,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
              elevation: 8,
            }}>
              <Icon.BrandMark size={32} color="#fff" />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 6 }}>
              <Text style={{ fontSize: 28, fontWeight: '800', color: theme.text, fontFamily: fonts.display }}>
                Visit
              </Text>
              <Text style={{ fontSize: 28, fontWeight: '800', color: theme.primary, fontFamily: fonts.display }}>
                Plan
              </Text>
            </View>

            <Text style={{ fontSize: 12, color: theme.textSecondary, textAlign: 'center' }}>
              Field Visit Management · BIM Group
            </Text>
          </View>

          <View style={{
            width: '100%',
            paddingHorizontal: 16,
            paddingVertical: 18,
            borderRadius: radii.xl,
            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : theme.border,
          }}>

            {banner ? (
              <View style={{
                backgroundColor: banner.tone === 'error' ? theme.errorLight : theme.primaryLight,
                padding: 12, borderRadius: radii.md, marginBottom: 14,
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

            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 14 }}>
              <Text style={{ fontSize: 11, color: theme.textFaint, textAlign: 'center' }}>
                Secured with Microsoft Entra ID
              </Text>
            </View>
          </View>

          <Text style={{ fontSize: 10, color: theme.textFaint, marginTop: 18, textAlign: 'center' }}>
            VisitPlan v2.4 · BIM Group Myanmar · Entra ID SSO
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
