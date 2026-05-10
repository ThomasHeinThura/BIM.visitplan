import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme, fonts } from '../context/ThemeContext';
import { Avatar, Icon, SecondaryButton } from './ui';

type Props = {
  onLogout: () => void;
};

export default function PendingApprovalScreen({ onLogout }: Props) {
  const { theme, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.loginBgVia ?? theme.bg }]}> 
      <View style={{
        position: 'absolute', top: -80, right: -80, width: 240, height: 240,
        borderRadius: 120, backgroundColor: theme.primary, opacity: 0.12,
      }} />
      <View style={{
        position: 'absolute', bottom: -60, left: -60, width: 200, height: 200,
        borderRadius: 100, backgroundColor: theme.primary, opacity: 0.08,
      }} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <View style={{
            width: 52, height: 52, borderRadius: 16,
            backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center',
            marginBottom: 14,
            shadowColor: theme.primary, shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
          }}>
            <Icon.BrandMark size={32} color="#fff" />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={{ fontSize: 28, fontWeight: '800', color: theme.text, fontFamily: fonts.display }}>Visit</Text>
            <Text style={{ fontSize: 28, fontWeight: '800', color: theme.primary, fontFamily: fonts.display }}>Plan</Text>
          </View>
        </View>

        <View style={[styles.card, {
          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : theme.surface,
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : theme.border,
        }]}> 
          <View style={[styles.iconCircle, { backgroundColor: theme.warningLight, borderColor: theme.warning }]}> 
            <Icon.Clock size={28} color={theme.warning} />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Account Pending Approval</Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}> 
            Your Microsoft account has been recognised. An admin will assign your role before you can access the app.
          </Text>
          <View style={[styles.profileCard, { borderColor: isDark ? 'rgba(255,255,255,0.08)' : theme.border }]}> 
            <Avatar name="Pending User" size={40} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text, fontFamily: fonts.display }}>Pending account</Text>
              <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 1 }}>Microsoft work profile</Text>
              <Text style={{ fontSize: 10, color: theme.textFaint, marginTop: 2 }}>Role will be assigned after approval</Text>
            </View>
          </View>
          <View style={[styles.infoBox, { backgroundColor: theme.warningLight, borderColor: theme.warning }]}> 
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Icon.Bell size={16} color={theme.warning} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.warning, marginBottom: 3 }}>Awaiting role assignment</Text>
                <Text style={[styles.infoText, { color: theme.textSecondary }]}> 
                  You'll get access once an admin assigns your role. Contact your manager if this takes more than 24 hours.
                </Text>
              </View>
            </View>
          </View>
          <SecondaryButton label="Sign Out" onPress={onLogout} />
          <Text style={{ fontSize: 10, color: theme.textFaint, marginTop: 16, textAlign: 'center' }}>
            VisitPlan v2.4 · BIM Group Myanmar
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingTop: 56,
    paddingBottom: 28,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: fonts.display,
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 20,
  },
  profileCard: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  infoBox: {
    width: '100%',
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 11,
    lineHeight: 17,
  },
});
