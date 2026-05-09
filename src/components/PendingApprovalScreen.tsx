import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

type Props = {
  onLogout: () => void;
};

export default function PendingApprovalScreen({ onLogout }: Props) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.card, { backgroundColor: theme.surface, shadowColor: theme.cardShadow }]}>
        <View style={[styles.iconCircle, { backgroundColor: theme.statusHold }]}>
          <Text style={styles.iconText}>⏳</Text>
        </View>
        <Text style={[styles.title, { color: theme.text }]}>Awaiting Approval</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Your account has been created and is pending review by an administrator.
          You will be notified once access is granted.
        </Text>
        <View style={[styles.infoBox, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            Please contact your team lead if this is taking too long.
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: theme.border }]}
          onPress={onLogout}
          activeOpacity={0.7}
        >
          <Text style={[styles.logoutText, { color: theme.textSecondary }]}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconText: { fontSize: 32 },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  infoBox: {
    width: '100%',
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  logoutBtn: {
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 8,
    borderWidth: 1,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
