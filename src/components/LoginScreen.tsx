import React from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { Banner } from './Banner';
import { LabeledInput } from './FieldControls';
import { MetricCard } from './MetricCard';
import { styles } from '../styles';

type BannerState = {
  tone: 'error' | 'success' | 'info';
  message: string;
};

type LoginFormState = {
  baseUrl: string;
  email: string;
  password: string;
};

export function LoginScreen({
  banner,
  loggingIn,
  loginForm,
  onChangeLoginForm,
  onSubmit,
}: {
  banner: BannerState | null;
  loggingIn: boolean;
  loginForm: LoginFormState;
  onChangeLoginForm: React.Dispatch<React.SetStateAction<LoginFormState>>;
  onSubmit: () => void;
}) {
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
            One Expo codebase for iOS, Android, and web, built on the CRM bearer-token API.
          </Text>

          <LabeledInput
            label="API Base URL"
            value={loginForm.baseUrl}
            onChangeText={(value) => onChangeLoginForm((current) => ({ ...current, baseUrl: value }))}
            placeholder="https://uat-crm.bimats.com:10443"
            autoCapitalize="none"
          />
          <LabeledInput
            label="Email"
            value={loginForm.email}
            onChangeText={(value) => onChangeLoginForm((current) => ({ ...current, email: value }))}
            placeholder="user@company.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <LabeledInput
            label="Password"
            value={loginForm.password}
            onChangeText={(value) => onChangeLoginForm((current) => ({ ...current, password: value }))}
            placeholder="Enter CRM password"
            secureTextEntry
          />

          {banner ? <Banner banner={banner} /> : null}

          <Pressable
            disabled={loggingIn}
            onPress={onSubmit}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && !loggingIn ? styles.primaryButtonPressed : null,
              loggingIn ? styles.buttonDisabled : null,
            ]}
          >
            {loggingIn ? <ActivityIndicator color="#F8FAFC" /> : <Text style={styles.primaryButtonText}>Sign In To Visitplan</Text>}
          </Pressable>
        </View>

        <View style={styles.loginShowcaseCard}>
          <Text style={styles.showcaseEyebrow}>Workspace Preview</Text>
          <Text style={styles.showcaseTitle}>Fast planning, cleaner follow-up, one modern dashboard.</Text>
          <View style={styles.showcaseChartCard}>
            <View style={styles.showcaseLine} />
            <View style={styles.showcaseLineShort} />
            <View style={styles.showcaseLineDot} />
          </View>
          <View style={styles.showcaseMetricRow}>
            <MetricCard label="Modes" value="Web / iOS / Android" />
            <MetricCard label="Flow" value="Create / Update / Result" />
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}