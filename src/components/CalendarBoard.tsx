import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { styles } from '../styles';
import type { VisitPlan } from '../types';
import { STATUS_OPTIONS, buildCalendarDays, formatCalendarHeader, formatReadableDate } from '../utils/visitplan';
import { FilterChip } from './FieldControls';

export function CalendarBoard({
  currentMonth,
  selectedDate,
  visitPlans,
  loading,
  searchText,
  onChangeSearchText,
  activeStatusFilter,
  onChangeStatusFilter,
  onPreviousMonth,
  onNextMonth,
  onSelectDate,
  onCreateVisitPlan,
  onRefresh,
  plansForSelectedDate,
  onOpenVisitPlan,
  onEditVisitPlan,
}: {
  currentMonth: Date;
  selectedDate: string;
  visitPlans: VisitPlan[];
  loading: boolean;
  searchText: string;
  onChangeSearchText: (value: string) => void;
  activeStatusFilter: number | null;
  onChangeStatusFilter: (value: number | null) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onSelectDate: (value: string) => void;
  onCreateVisitPlan: () => void;
  onRefresh: () => void;
  plansForSelectedDate: VisitPlan[];
  onOpenVisitPlan: (id: number) => void;
  onEditVisitPlan: (visitPlan: VisitPlan) => void;
}) {
  const calendarDays = buildCalendarDays(currentMonth, visitPlans);

  return (
    <View style={styles.mainColumn}>
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Visit Plan Calendar</Text>
            <Text style={styles.sectionSubtitle}>Create and edit visit plans from a calendar-first view.</Text>
          </View>
          <View style={styles.headerActionRow}>
            <Pressable onPress={onRefresh} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Refresh</Text>
            </Pressable>
            <Pressable onPress={onCreateVisitPlan} style={styles.primaryButtonSmall}>
              <Text style={styles.primaryButtonText}>Create Visit Plan</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.toolbarRow}>
          <TextInput
            value={searchText}
            onChangeText={onChangeSearchText}
            placeholder="Search title, agenda, description, creator, or client"
            placeholderTextColor="#94A3B8"
            style={[styles.input, styles.searchInput]}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipRow}>
          <FilterChip label="All" active={activeStatusFilter === null} onPress={() => onChangeStatusFilter(null)} />
          {STATUS_OPTIONS.map((status) => (
            <FilterChip
              key={status.id}
              label={status.label}
              active={activeStatusFilter === status.id}
              onPress={() => onChangeStatusFilter(status.id)}
            />
          ))}
        </ScrollView>

        <View style={styles.calendarNavRow}>
          <Pressable onPress={onPreviousMonth} style={styles.secondaryButtonMuted}>
            <Text style={styles.secondaryButtonText}>Previous</Text>
          </Pressable>
          <Text style={styles.calendarMonthTitle}>{formatCalendarHeader(currentMonth)}</Text>
          <Pressable onPress={onNextMonth} style={styles.secondaryButtonMuted}>
            <Text style={styles.secondaryButtonText}>Next</Text>
          </Pressable>
        </View>

        <View style={styles.calendarWeekHeaderRow}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <Text key={day} style={styles.calendarWeekHeaderText}>{day}</Text>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {calendarDays.map((day) => {
            const isSelected = day.isoDate === selectedDate;

            return (
              <Pressable
                key={day.isoDate}
                onPress={() => onSelectDate(day.isoDate)}
                style={({ pressed }) => [
                  styles.calendarCell,
                  !day.isCurrentMonth ? styles.calendarCellMuted : null,
                  isSelected ? styles.calendarCellActive : null,
                  pressed ? styles.calendarCellPressed : null,
                ]}
              >
                <Text style={isSelected ? styles.calendarCellTextActive : styles.calendarCellText}>{day.dayOfMonth}</Text>
                {day.items.slice(0, 2).map((item) => (
                  <Text key={`${day.isoDate}-${item.id}`} style={styles.calendarItemPreview} numberOfLines={1}>
                    {item.title}
                  </Text>
                ))}
                {day.items.length > 2 ? <Text style={styles.calendarMoreText}>+{day.items.length - 2} more</Text> : null}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.selectedDateHeader}>
          <Text style={styles.sectionTitle}>Selected Day</Text>
          <Text style={styles.sectionSubtitle}>{formatReadableDate(selectedDate)}</Text>
        </View>

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color="#355CFF" />
            <Text style={styles.loadingText}>Loading visit plans...</Text>
          </View>
        ) : plansForSelectedDate.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No visit plans on this day</Text>
            <Text style={styles.emptyStateDescription}>Use Create Visit Plan to add one for the selected date.</Text>
          </View>
        ) : (
          <View style={styles.cardStack}>
            {plansForSelectedDate.map((visitPlan) => (
              <View key={visitPlan.id} style={styles.visitPlanCard}>
                <View style={styles.visitPlanCardHeader}>
                  <View style={styles.visitPlanCardTitleWrap}>
                    <Text style={styles.visitPlanCardTitle}>{visitPlan.title}</Text>
                    <Text style={styles.visitPlanCardMeta}>{visitPlan.client_name || 'No client selected'}</Text>
                  </View>
                  <Text style={styles.visitPlanCardBadge}>{visitPlan.status}</Text>
                </View>
                <Text style={styles.visitPlanCardMeta}>{visitPlan.start_time} - {visitPlan.end_time}</Text>
                <Text style={styles.visitPlanCardMeta}>{visitPlan.agenda}</Text>
                <View style={styles.inlineButtonRow}>
                  <Pressable onPress={() => onOpenVisitPlan(visitPlan.id)} style={styles.secondaryButtonMuted}>
                    <Text style={styles.secondaryButtonText}>Open Summary</Text>
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
    </View>
  );
}