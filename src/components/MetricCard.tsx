import React from 'react';
import { Text, View } from 'react-native';
import { styles } from '../styles';

export function MetricCard({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <View style={compact ? styles.metricCardCompact : styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={compact ? styles.metricValueCompact : styles.metricValue}>{value}</Text>
    </View>
  );
}