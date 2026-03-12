import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { styles } from '../styles';

export function WorkspaceHeader({
  userName,
  scopeLabel,
  onLogout,
}: {
  userName: string;
  scopeLabel: string;
  onLogout: () => void;
}) {
  return (
    <View style={styles.workspaceHeaderCard}>
      <View style={styles.workspaceHeaderTextWrap}>
        <Text style={styles.eyebrow}>BIM CRM</Text>
        <Text style={styles.workspaceHeaderTitle}>Visitplan Workspace</Text>
        <Text style={styles.workspaceHeaderSubtitle}>
          Web-first workspace for visit planning, client context, and review.
        </Text>
      </View>

      <View style={styles.workspaceHeaderActions}>
        <View style={styles.workspaceIdentityBadge}>
          <Text style={styles.workspaceIdentityName}>{userName}</Text>
          <Text style={styles.workspaceIdentityMeta}>Scope {scopeLabel}</Text>
        </View>
        <Pressable onPress={onLogout} style={styles.secondaryButtonMuted}>
          <Text style={styles.secondaryButtonText}>Logout</Text>
        </Pressable>
      </View>
    </View>
  );
}