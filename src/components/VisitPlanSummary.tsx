import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { styles } from '../styles';
import type { VisitPlan } from '../types';

export function VisitPlanSummary({
  visitPlans,
  userName,
  totalPlans,
  scopeLabel,
  selectedDate,
  onEditVisitPlan,
  onJumpToPlanDate,
  onCreateVisitPlan,
  onLogout,
}: {
  visitPlans: VisitPlan[];
  userName: string;
  totalPlans: number;
  scopeLabel: string;
  selectedDate: string;
  onEditVisitPlan: (visitPlan: VisitPlan) => void;
  onJumpToPlanDate: (date: string) => void;
  onCreateVisitPlan: () => void;
  onLogout: () => void;
}) {
  const sortedPlans = [...visitPlans].sort((left, right) => {
    const leftKey = `${left.date} ${left.start_time}`;
    const rightKey = `${right.date} ${right.start_time}`;
    return leftKey.localeCompare(rightKey);
  });
  const initials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  return (
    <ScrollView contentContainerStyle={styles.sideColumnStack}>
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
        <Pressable onPress={onLogout} style={styles.secondaryButtonMuted}>
          <Text style={styles.secondaryButtonText}>Logout</Text>
        </Pressable>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Your Visit Plans</Text>
        <View style={styles.summaryStatsGrid}>
          <View style={styles.summaryStatCard}>
            <Text style={styles.summaryStatLabel}>Total visible</Text>
            <Text style={styles.summaryStatValue}>{totalPlans}</Text>
          </View>
          <View style={styles.summaryStatCard}>
            <Text style={styles.summaryStatLabel}>Scope</Text>
            <Text style={styles.summaryStatValueSmall}>{scopeLabel}</Text>
          </View>
          <View style={styles.summaryStatCard}>
            <Text style={styles.summaryStatLabel}>Window starts</Text>
            <Text style={styles.summaryStatValueSmall}>{selectedDate}</Text>
          </View>
        </View>
        <View style={styles.inlineButtonRowCompact}>
          <Pressable onPress={onCreateVisitPlan} style={styles.primaryButtonSmall}>
            <Text style={styles.primaryButtonText}>Create Visit Plan</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>All Visible Plan Summaries</Text>
        <Text style={styles.sectionSubtitle}>Showing the same set counted in Total visible.</Text>

        {sortedPlans.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No visit plans found</Text>
            <Text style={styles.emptyStateDescription}>Adjust search or filters, or create a new visit plan.</Text>
          </View>
        ) : (
          <ScrollView style={styles.summaryListScroll} contentContainerStyle={styles.summaryListStack} nestedScrollEnabled>
            {sortedPlans.map((visitPlan) => (
              <View key={visitPlan.id} style={styles.summaryListCard}>
                <View style={styles.visitPlanCardHeader}>
                  <View style={styles.visitPlanCardTitleWrap}>
                    <Text style={styles.visitPlanCardTitle} numberOfLines={2}>{visitPlan.title}</Text>
                    <Text style={styles.visitPlanCardMeta} numberOfLines={1}>{visitPlan.client_name || 'No client selected'}</Text>
                  </View>
                  <Text style={styles.visitPlanCardBadge}>{visitPlan.status}</Text>
                </View>
                <Text style={styles.visitPlanCardMeta}>{visitPlan.date} | {visitPlan.start_time} - {visitPlan.end_time}</Text>
                <Text style={styles.visitPlanCardMeta}>Creator: {visitPlan.creator?.name || 'Unknown'}</Text>
                <Text style={styles.visitPlanCardMeta} numberOfLines={2}>{visitPlan.agenda}</Text>
                <View style={styles.inlineButtonRowCompact}>
                  <Pressable onPress={() => onJumpToPlanDate(visitPlan.date)} style={styles.secondaryButtonMuted}>
                    <Text style={styles.secondaryButtonText}>Show Day</Text>
                  </Pressable>
                  {visitPlan.permissions?.can_edit ? (
                    <Pressable onPress={() => onEditVisitPlan(visitPlan)} style={styles.primaryButtonSmall}>
                      <Text style={styles.primaryButtonText}>Edit</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </ScrollView>
  );
}
