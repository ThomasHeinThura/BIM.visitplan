import React from 'react';
import { Text, View } from 'react-native';
import { styles } from '../styles';
import type { VisitPlan } from '../types';
import { VisitPlanSummary } from './VisitPlanSummary';

export function ReviewScreen({
  visitPlans,
  weeklyPlans,
  weekRangeLabel,
  selectedDate,
  scopeLabel,
  userName,
  onEditVisitPlan,
  onJumpToPlanDate,
  onCreateVisitPlan,
}: {
  visitPlans: VisitPlan[];
  weeklyPlans: number;
  weekRangeLabel: string;
  selectedDate: string;
  scopeLabel: string;
  userName: string;
  onEditVisitPlan: (visitPlan: VisitPlan) => void;
  onJumpToPlanDate: (date: string) => void;
  onCreateVisitPlan: () => void;
}) {
  const completedPlans = visitPlans.filter((visitPlan) => visitPlan.status_id === 2).length;
  const inProgressPlans = visitPlans.filter((visitPlan) => visitPlan.status_id === 1).length;

  return (
    <View style={styles.pageStack}>
      <View style={styles.pageHeaderCard}>
        <Text style={styles.pageTitle}>Review</Text>
        <Text style={styles.pageSubtitle}>
          Reporting and loaded summary views for the current visit plan dataset.
        </Text>
      </View>

      <View style={styles.reviewMetricGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Loaded plans</Text>
          <Text style={styles.metricValue}>{visitPlans.length}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>In progress</Text>
          <Text style={styles.metricValue}>{inProgressPlans}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Completed</Text>
          <Text style={styles.metricValue}>{completedPlans}</Text>
        </View>
      </View>

      <VisitPlanSummary
        visitPlans={visitPlans}
        userName={userName}
        weeklyPlans={weeklyPlans}
        scopeLabel={scopeLabel}
        selectedDate={selectedDate}
        weekRangeLabel={weekRangeLabel}
        onEditVisitPlan={onEditVisitPlan}
        onJumpToPlanDate={onJumpToPlanDate}
        onCreateVisitPlan={onCreateVisitPlan}
        showSessionBanner={false}
      />
    </View>
  );
}