import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { styles } from '../styles';
import type { VisitPlan } from '../types';
import { STATUS_OPTIONS } from '../utils/visitplan';
import { FilterChip } from './FieldControls';

export function CalendarBoard({
  selectedDate,
  visitPlans,
  compactLayout,
  loading,
  searchText,
  onChangeSearchText,
  activeStatusFilter,
  onChangeStatusFilter,
  onPreviousWindow,
  onNextWindow,
  onSelectDate,
  onCreateVisitPlan,
  onRefresh,
  onOpenVisitPlan,
  onEditVisitPlan,
}: {
  selectedDate: string;
  visitPlans: VisitPlan[];
  compactLayout: boolean;
  loading: boolean;
  searchText: string;
  onChangeSearchText: (value: string) => void;
  activeStatusFilter: number | null;
  onChangeStatusFilter: (value: number | null) => void;
  onPreviousWindow: () => void;
  onNextWindow: () => void;
  onSelectDate: (value: string) => void;
  onCreateVisitPlan: () => void;
  onRefresh: () => void;
  onOpenVisitPlan: (id: number) => void;
  onEditVisitPlan: (visitPlan: VisitPlan) => void;
}) {
  const scheduleDays = buildThreeDayWindow(selectedDate);

  return (
    <View style={styles.mainColumn}>
      <View style={styles.sectionCard}>
        <View style={[styles.sectionHeaderRow, compactLayout ? styles.sectionHeaderRowStacked : null]}>
          <View>
            <Text style={styles.sectionTitle}>Visit Plan Schedule</Text>
            <Text style={styles.sectionSubtitle}>Three-day list view for fast planning and quick edits.</Text>
          </View>
          <View style={[styles.headerActionRow, compactLayout ? styles.headerActionRowStacked : null]}>
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
          <Pressable onPress={onPreviousWindow} style={styles.secondaryButtonMuted}>
            <Text style={styles.secondaryButtonText}>Previous</Text>
          </Pressable>
          <Text style={styles.calendarMonthTitle}>3-Day Calendar List</Text>
          <Pressable onPress={onNextWindow} style={styles.secondaryButtonMuted}>
            <Text style={styles.secondaryButtonText}>Next</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color="#355CFF" />
            <Text style={styles.loadingText}>Loading visit plans...</Text>
          </View>
        ) : compactLayout ? (
          <View style={styles.mobileScheduleList}>
            {scheduleDays.map((day) => {
              const dayPlans = visitPlans
                .filter((item) => item.date === day.isoDate)
                .sort((left, right) => left.start_time.localeCompare(right.start_time));
              const isSelected = day.isoDate === selectedDate;

              return (
                <View key={day.isoDate} style={[styles.mobileScheduleSection, isSelected ? styles.mobileScheduleSectionActive : null]}>
                  <Pressable onPress={() => onSelectDate(day.isoDate)} style={styles.mobileScheduleHeader}>
                    <View>
                      <Text style={styles.scheduleDayTitle}>{day.dayName}</Text>
                      <Text style={styles.scheduleDayDate}>{day.dateLabel}</Text>
                    </View>
                    <Text style={styles.scheduleDayCount}>{dayPlans.length} plan{dayPlans.length === 1 ? '' : 's'}</Text>
                  </Pressable>

                  {dayPlans.length === 0 ? (
                    <View style={styles.scheduleDayEmpty}>
                      <Text style={styles.emptyStateDescription}>No visit plans for this day.</Text>
                    </View>
                  ) : (
                    <ScrollView
                      nestedScrollEnabled
                      style={styles.mobileScheduleScroll}
                      contentContainerStyle={styles.scheduleDayStack}
                      showsVerticalScrollIndicator={false}
                    >
                      {dayPlans.map((visitPlan) => (
                        <View key={visitPlan.id} style={styles.visitPlanCardCompact}>
                          <View style={styles.visitPlanCardHeader}>
                            <View style={styles.visitPlanCardTitleWrap}>
                              <Text style={styles.visitPlanCardTitle} numberOfLines={2}>{visitPlan.title}</Text>
                              <Text style={styles.visitPlanCardMeta} numberOfLines={1}>{visitPlan.client_name || 'No client selected'}</Text>
                            </View>
                            <Text style={styles.visitPlanCardBadge}>{visitPlan.status}</Text>
                          </View>
                          <Text style={styles.visitPlanCardMeta}>{visitPlan.start_time} - {visitPlan.end_time}</Text>
                          <Text style={styles.visitPlanCardMeta} numberOfLines={2}>{visitPlan.agenda}</Text>
                          <View style={styles.inlineButtonRowCompact}>
                            <Pressable onPress={() => onOpenVisitPlan(visitPlan.id)} style={styles.secondaryButtonMuted}>
                              <Text style={styles.secondaryButtonText}>Summary</Text>
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
              );
            })}
          </View>
        ) : (
          <View style={[styles.scheduleDayGrid, compactLayout ? styles.scheduleDayGridStacked : null]}>
            {scheduleDays.map((day) => {
              const dayPlans = visitPlans
                .filter((item) => item.date === day.isoDate)
                .sort((left, right) => left.start_time.localeCompare(right.start_time));
              const isSelected = day.isoDate === selectedDate;

              return (
                <View
                  key={day.isoDate}
                  style={[
                    styles.scheduleDayColumn,
                    compactLayout ? styles.scheduleDayColumnStacked : null,
                    isSelected ? styles.scheduleDayColumnActive : null,
                  ]}
                >
                  <Pressable onPress={() => onSelectDate(day.isoDate)} style={styles.scheduleDayHeader}>
                    <Text style={styles.scheduleDayTitle}>{day.dayName}</Text>
                    <Text style={styles.scheduleDayDate}>{day.dateLabel}</Text>
                    <Text style={styles.scheduleDayCount}>{dayPlans.length} plan{dayPlans.length === 1 ? '' : 's'}</Text>
                  </Pressable>

                  {dayPlans.length === 0 ? (
                    <View style={styles.scheduleDayEmpty}>
                      <Text style={styles.emptyStateDescription}>No visit plans for this day.</Text>
                    </View>
                  ) : (
                    <ScrollView
                      nestedScrollEnabled
                      style={compactLayout ? styles.scheduleDayScrollCompact : styles.scheduleDayScroll}
                      contentContainerStyle={styles.scheduleDayStack}
                      showsVerticalScrollIndicator={false}
                    >
                      {dayPlans.map((visitPlan) => (
                        <View key={visitPlan.id} style={styles.visitPlanCardCompact}>
                          <View style={styles.visitPlanCardHeader}>
                            <View style={styles.visitPlanCardTitleWrap}>
                              <Text style={styles.visitPlanCardTitle} numberOfLines={2}>{visitPlan.title}</Text>
                              <Text style={styles.visitPlanCardMeta} numberOfLines={1}>{visitPlan.client_name || 'No client selected'}</Text>
                            </View>
                            <Text style={styles.visitPlanCardBadge}>{visitPlan.status}</Text>
                          </View>
                          <Text style={styles.visitPlanCardMeta}>{visitPlan.start_time} - {visitPlan.end_time}</Text>
                          <Text style={styles.visitPlanCardMeta} numberOfLines={2}>{visitPlan.agenda}</Text>
                          <View style={styles.inlineButtonRowCompact}>
                            <Pressable onPress={() => onOpenVisitPlan(visitPlan.id)} style={styles.secondaryButtonMuted}>
                              <Text style={styles.secondaryButtonText}>Summary</Text>
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
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

function buildThreeDayWindow(anchorIsoDate: string) {
  const start = new Date(`${anchorIsoDate}T00:00:00`);

  return Array.from({ length: 3 }, (_, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);

    return {
      isoDate: toIsoDate(current),
      dayName: current.toLocaleDateString(undefined, { weekday: 'short' }),
      dateLabel: current.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    };
  });
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
