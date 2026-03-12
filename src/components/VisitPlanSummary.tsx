import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { styles } from '../styles';

export function VisitPlanSummary({
  userName,
  weeklyPlans,
  scopeLabel,
  weekRangeLabel,
  onCreateVisitPlan,
  onLogout,
  showSessionBanner = true,
}: {
  userName: string;
  weeklyPlans: number;
  scopeLabel: string;
  weekRangeLabel: string;
  onCreateVisitPlan: () => void;
  onLogout?: () => void;
  showSessionBanner?: boolean;
}) {
  const initials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  return (
    <View style={styles.sideColumnStack}>
      {showSessionBanner ? (
        <View style={styles.sessionBanner}>
          <View style={styles.sessionIdentityRow}>
            <View style={styles.sessionAvatar}>
              <Text style={styles.sessionAvatarText}>{initials || 'VP'}</Text>
            </View>
            <View style={styles.sessionIdentityText}>
              <Text style={styles.sessionUserName}>{userName}</Text>
              <Text style={styles.sessionUserMeta}>Scope {scopeLabel}</Text>
            </View>
          </View>
          {onLogout ? (
            <Pressable onPress={onLogout} style={styles.secondaryButtonMuted}>
              <Text style={styles.secondaryButtonText}>Logout</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Your Visit Plans</Text>
        <View style={styles.summaryStatsGrid}>
          <View style={styles.summaryStatCard}>
            <Text style={styles.summaryStatLabel}>This week visit plans</Text>
            <Text style={styles.summaryStatValue}>{weeklyPlans}</Text>
          </View>
          <View style={styles.summaryStatCard}>
            <Text style={styles.summaryStatLabel}>Week range</Text>
            <Text style={styles.summaryStatValueSmall}>{weekRangeLabel}</Text>
          </View>
        </View>
        <View style={styles.inlineButtonRowCompact}>
          <Pressable onPress={onCreateVisitPlan} style={styles.primaryButtonSmall}>
            <Text style={styles.primaryButtonText}>Create Visit Plan</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
