/**
 * Visits — month calendar or flat list.
 *
 * The two views answer different questions. The calendar answers "how busy am I, and
 * when": counts and sector dots per day, so the shape of the month is readable at a
 * glance. The list answers "what exactly", with status filters and search.
 *
 * Both are server-driven. The calendar fetches its month in one from/to-bounded
 * request; the list fetches by filter. Nothing is filtered client-side beyond selecting
 * a day from the month already in hand — anything more would either not survive
 * pagination or imply the client received rows the row-level scope should have withheld.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';

import { useTheme } from '../../context/ThemeContext';
import type { VisitPlan, VisitStatusValue } from '../../lib/crm/types';
import { listVisits } from '../../lib/crm/visits';
import { Rise } from '../../ui/Surface';
import { alpha, radius, space, type } from '../../ui/tokens';
import { SearchBar } from '../ui';
import { EmptyState, ErrorState, LoadingState, NoAccessState } from './States';
import { useResource } from './useResource';
import { VisitCalendar, dayKey, monthRange } from './VisitCalendar';
import { VisitCard } from './VisitCard';

type Mode = 'month' | 'list';
type StatusFilter = 'all' | VisitStatusValue;

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'planned', label: 'Planned' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

function SegmentedToggle({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  const { theme } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: theme.surfaceOffset,
        borderRadius: radius.pill,
        padding: 3,
      }}
    >
      {(['month', 'list'] as Mode[]).map((key) => {
        const active = mode === key;

        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 6,
              borderRadius: radius.pill,
              backgroundColor: active ? theme.surface : 'transparent',
            }}
          >
            <Text style={[type.micro, { color: active ? theme.primary : theme.textFaint }]}>
              {key === 'month' ? 'Month' : 'List'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function VisitListScreen({ onOpenVisit }: { onOpenVisit?: (visit: VisitPlan) => void }) {
  const { theme } = useTheme();

  const [mode, setMode] = useState<Mode>('month');
  const [anchor, setAnchor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const [status, setStatus] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [committedSearch, setCommittedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setCommittedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Keyed on the month so switching months refetches, but moving between days does not.
  const monthKey = `${anchor.getFullYear()}-${anchor.getMonth()}`;

  const month = useResource((signal) => {
    const range = monthRange(anchor);
    // per_page high enough that a busy month is not truncated into a misleading count.
    return listVisits({ from: range.from, to: range.to, per_page: 100 }, signal);
  }, [monthKey]);

  const list = useResource(
    (signal) =>
      listVisits(
        {
          status: status === 'all' ? undefined : status,
          search: committedSearch || undefined,
          per_page: 50,
        },
        signal,
      ),
    [status, committedSearch],
  );

  const monthVisits = month.data?.data ?? [];

  const dayVisits = useMemo(
    () =>
      selectedDay === null
        ? []
        : monthVisits.filter((visit) => dayKey(new Date(visit.scheduled_at)) === selectedDay),
    [selectedDay, monthVisits],
  );

  const selectedLabel = useMemo(() => {
    if (selectedDay === null) return null;

    const [year, monthIndex, day] = selectedDay.split('-').map(Number);

    return new Date(year, monthIndex, day).toLocaleDateString(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }, [selectedDay]);

  const active = mode === 'month' ? month : list;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: space.lg,
          paddingTop: space.md,
          paddingBottom: space.sm,
        }}
      >
        <View>
          <Text style={[type.micro, { color: theme.primary }]}>Schedule</Text>
          <Text style={[type.display, { color: theme.text }]}>Visits</Text>
        </View>

        <SegmentedToggle mode={mode} onChange={setMode} />
      </View>

      {active.forbidden ? (
        <NoAccessState what="visit plans" />
      ) : mode === 'month' ? (
        <ScrollView contentContainerStyle={{ paddingBottom: space.xxl }}>
          {month.loading ? (
            <LoadingState label="Loading month…" />
          ) : month.error ? (
            <ErrorState message={month.error} onRetry={month.refetch} />
          ) : (
            <>
              <VisitCalendar
                anchor={anchor}
                visits={monthVisits}
                selectedKey={selectedDay}
                onSelectDay={setSelectedDay}
                onChangeMonth={setAnchor}
              />

              <View style={{ paddingHorizontal: space.lg, marginTop: space.xl, marginBottom: space.md }}>
                <Text style={[type.micro, { color: theme.primary }]}>
                  {selectedDay ? 'Selected day' : 'This month'}
                </Text>
                <Text style={[type.title, { color: theme.text }]}>
                  {selectedLabel ??
                    anchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                </Text>
              </View>

              {(selectedDay ? dayVisits : monthVisits).length === 0 ? (
                <EmptyState
                  icon="◷"
                  title={selectedDay ? 'Nothing on this day' : 'No visits this month'}
                  message={
                    selectedDay
                      ? 'Pick another day, or clear the selection to see the whole month.'
                      : 'Use the arrows above to look at another month.'
                  }
                />
              ) : (
                (selectedDay ? dayVisits : monthVisits).map((visit, index) => (
                  <Rise key={visit.id} index={index}>
                    <VisitCard
                      visit={visit}
                      onPress={onOpenVisit ? () => onOpenVisit(visit) : undefined}
                    />
                  </Rise>
                ))
              )}
            </>
          )}
        </ScrollView>
      ) : (
        <>
          <View style={{ paddingHorizontal: space.lg, paddingBottom: space.sm }}>
            <SearchBar value={search} onChange={setSearch} placeholder="Search visits or clients" />
          </View>

          <View
            style={{
              flexDirection: 'row',
              gap: space.sm,
              paddingHorizontal: space.lg,
              paddingBottom: space.md,
            }}
          >
            {FILTERS.map((filter) => {
              const isActive = status === filter.key;

              return (
                <Pressable
                  key={filter.key}
                  onPress={() => setStatus(filter.key)}
                  style={{
                    paddingHorizontal: 13,
                    paddingVertical: 6,
                    borderRadius: radius.pill,
                    backgroundColor: isActive ? theme.primary : theme.surfaceOffset,
                    borderWidth: 1,
                    borderColor: isActive ? theme.primary : theme.border,
                  }}
                >
                  <Text
                    style={[
                      type.micro,
                      { color: isActive ? '#fff' : theme.textSecondary, letterSpacing: 0.4 },
                    ]}
                  >
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {list.loading ? (
            <LoadingState label="Loading visits…" />
          ) : list.error ? (
            <ErrorState message={list.error} onRetry={list.refetch} />
          ) : (
            <FlatList
              data={list.data?.data ?? []}
              keyExtractor={(visit) => String(visit.id)}
              refreshing={list.refreshing}
              onRefresh={list.refetch}
              contentContainerStyle={{ paddingBottom: space.xxl }}
              renderItem={({ item, index }) => (
                <Rise index={index}>
                  <VisitCard visit={item} onPress={onOpenVisit ? () => onOpenVisit(item) : undefined} />
                </Rise>
              )}
              ListEmptyComponent={
                <EmptyState
                  icon="◷"
                  title={committedSearch ? 'No matches' : 'No visits yet'}
                  message={
                    committedSearch
                      ? `Nothing matched "${committedSearch}". Try a different client or title.`
                      : status === 'all'
                        ? 'Visits you plan will appear here.'
                        : `You have no ${status} visits.`
                  }
                />
              }
              ListFooterComponent={
                list.data && list.data.meta.total > list.data.data.length ? (
                  <Text
                    style={[
                      type.micro,
                      { textAlign: 'center', color: theme.textFaint, paddingVertical: space.lg },
                    ]}
                  >
                    Showing {list.data.data.length} of {list.data.meta.total}
                  </Text>
                ) : null
              }
            />
          )}
        </>
      )}
    </View>
  );
}
