import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { styles } from '../styles';
import type { VisitPlan } from '../types';

export function ReviewScreen({
  visitPlans,
  onEditVisitPlan,
  onJumpToPlanDate,
}: {
  visitPlans: VisitPlan[];
  onEditVisitPlan: (visitPlan: VisitPlan) => void;
  onJumpToPlanDate: (date: string) => void;
}) {
  const sortedPlans = [...visitPlans].sort((left, right) => {
    const leftKey = `${left.date} ${left.start_time}`;
    const rightKey = `${right.date} ${right.start_time}`;
    return leftKey.localeCompare(rightKey);
  });

  return (
    <View style={styles.pageStack}>
      {sortedPlans.length === 0 ? (
        <View style={styles.sectionCard}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No visit plans found</Text>
            <Text style={styles.emptyStateDescription}>There are no loaded visit plans to review.</Text>
          </View>
        </View>
      ) : (
        <View style={styles.entityListStack}>
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
              <Text style={styles.detailBodyMuted} numberOfLines={2}>{visitPlan.agenda}</Text>
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
        </View>
      )}
    </View>
  );
}