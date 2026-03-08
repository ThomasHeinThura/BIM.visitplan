import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { styles } from '../styles';
import type { LookupItem, VisitPlanDraft } from '../types';
import { LOCATION_OPTIONS, STATUS_OPTIONS, TIME_OPTIONS, buildCalendarDays, formatCalendarHeader, getMonthStart } from '../utils/visitplan';
import { LabeledInput, LookupChooser, TeamMemberChooser } from './FieldControls';

export function VisitPlanModal({
  visible,
  mode,
  draft,
  setDraft,
  submitting,
  loadingLookups,
  canAssignMembers,
  visibleClients,
  visibleYears,
  visibleQuarters,
  visibleTeam,
  allTeam,
  lookupQueries,
  setLookupQueries,
  selectedClientLabel,
  selectedFinancialYearLabel,
  selectedFinancialQuarterLabel,
  onSubmit,
  onClose,
}: {
  visible: boolean;
  mode: 'create' | 'edit';
  draft: VisitPlanDraft;
  setDraft: React.Dispatch<React.SetStateAction<VisitPlanDraft>>;
  submitting: boolean;
  loadingLookups: boolean;
  canAssignMembers: boolean;
  visibleClients: LookupItem[];
  visibleYears: LookupItem[];
  visibleQuarters: LookupItem[];
  visibleTeam: LookupItem[];
  allTeam: LookupItem[];
  lookupQueries: { client: string; financialYear: string; financialQuarter: string; team: string };
  setLookupQueries: React.Dispatch<React.SetStateAction<{ client: string; financialYear: string; financialQuarter: string; team: string }>>;
  selectedClientLabel: string | null;
  selectedFinancialYearLabel: string | null;
  selectedFinancialQuarterLabel: string | null;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const [pickerMonth, setPickerMonth] = useState(() => getMonthStart(new Date(draft.date)));
  const calendarDays = useMemo(() => buildCalendarDays(pickerMonth, []), [pickerMonth]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>{mode === 'edit' ? 'Edit Visit Plan' : 'Create Visit Plan'}</Text>
              <Text style={styles.sectionSubtitle}>Use the popup form to create or update visit plans without leaving the calendar.</Text>
            </View>
            <Pressable onPress={onClose} style={styles.secondaryButtonMuted}>
              <Text style={styles.secondaryButtonText}>Close</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.formHeroStrip}>
              <Text style={styles.formHeroTitle}>Visit meeting setup</Text>
              <Text style={styles.formHeroText}>Meeting URL is optional. Agenda is required. Description can be used for expected or actual results.</Text>
            </View>

            <LabeledInput
              label="Title"
              value={draft.title}
              onChangeText={(value) => setDraft((current) => ({ ...current, title: value }))}
              placeholder="Customer renewal review"
            />

            <LookupChooser
              label="Client"
              query={lookupQueries.client}
              selectedLabel={selectedClientLabel}
              onChangeQuery={(value) => {
                setLookupQueries((current) => ({ ...current, client: value }));
                setDraft((current) => ({ ...current, client_id: null }));
              }}
              options={visibleClients}
              selectedId={draft.client_id}
              onSelect={(id, label) => {
                setDraft((current) => ({ ...current, client_id: id }));
                setLookupQueries((current) => ({ ...current, client: label }));
              }}
              onClear={() => {
                setDraft((current) => ({ ...current, client_id: null }));
                setLookupQueries((current) => ({ ...current, client: '' }));
              }}
              loading={loadingLookups}
              helperText="Type a client name and choose the correct record from the scroll list."
            />

            <LookupChooser
              label="Financial Year"
              query={lookupQueries.financialYear}
              selectedLabel={selectedFinancialYearLabel}
              onChangeQuery={(value) => {
                setLookupQueries((current) => ({ ...current, financialYear: value }));
                setDraft((current) => ({ ...current, financial_year_id: null }));
              }}
              options={visibleYears}
              selectedId={draft.financial_year_id}
              onSelect={(id, label) => {
                setDraft((current) => ({ ...current, financial_year_id: id }));
                setLookupQueries((current) => ({ ...current, financialYear: label }));
              }}
              onClear={() => {
                setDraft((current) => ({ ...current, financial_year_id: null }));
                setLookupQueries((current) => ({ ...current, financialYear: '' }));
              }}
              loading={loadingLookups}
              helperText="Search and pick the financial year from the dropdown box."
            />

            <LookupChooser
              label="Financial Quarter"
              query={lookupQueries.financialQuarter}
              selectedLabel={selectedFinancialQuarterLabel}
              onChangeQuery={(value) => {
                setLookupQueries((current) => ({ ...current, financialQuarter: value }));
                setDraft((current) => ({ ...current, financial_quarter_id: null }));
              }}
              options={visibleQuarters}
              selectedId={draft.financial_quarter_id}
              onSelect={(id, label) => {
                setDraft((current) => ({ ...current, financial_quarter_id: id }));
                setLookupQueries((current) => ({ ...current, financialQuarter: label }));
              }}
              onClear={() => {
                setDraft((current) => ({ ...current, financial_quarter_id: null }));
                setLookupQueries((current) => ({ ...current, financialQuarter: '' }));
              }}
              loading={loadingLookups}
              helperText="Type any part of the quarter name and choose the matching option."
            />

            {canAssignMembers ? (
              <TeamMemberChooser
                query={lookupQueries.team}
                onChangeQuery={(value) => setLookupQueries((current) => ({ ...current, team: value }))}
                options={visibleTeam}
                allOptions={allTeam}
                selectedIds={draft.members}
                onToggle={(id) => {
                  setDraft((current) => ({
                    ...current,
                    members: current.members.includes(id)
                      ? current.members.filter((memberId) => memberId !== id)
                      : [...current.members, id],
                  }));
                }}
                loading={loadingLookups}
              />
            ) : null}

            <View style={styles.datePickerCard}>
              <View style={styles.calendarNavRow}>
                <Text style={styles.fieldLabel}>Date Picker</Text>
                <View style={styles.headerActionRow}>
                  <Pressable onPress={() => setPickerMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} style={styles.secondaryButtonMuted}>
                    <Text style={styles.secondaryButtonText}>Previous</Text>
                  </Pressable>
                  <Pressable onPress={() => setPickerMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} style={styles.secondaryButtonMuted}>
                    <Text style={styles.secondaryButtonText}>Next</Text>
                  </Pressable>
                </View>
              </View>
              <Text style={styles.calendarMonthTitle}>{formatCalendarHeader(pickerMonth)}</Text>
              <View style={styles.calendarWeekHeaderRow}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <Text key={`picker-${day}`} style={styles.calendarWeekHeaderText}>{day}</Text>
                ))}
              </View>
              <View style={styles.calendarGrid}>
                {calendarDays.map((day) => (
                  <Pressable
                    key={`picker-${day.isoDate}`}
                    onPress={() => setDraft((current) => ({ ...current, date: day.isoDate }))}
                    style={({ pressed }) => [
                      styles.calendarCell,
                      !day.isCurrentMonth ? styles.calendarCellMuted : null,
                      draft.date === day.isoDate ? styles.calendarCellActive : null,
                      pressed ? styles.calendarCellPressed : null,
                    ]}
                  >
                    <Text style={draft.date === day.isoDate ? styles.calendarCellTextActive : styles.calendarCellText}>{day.dayOfMonth}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.rowFields}>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Start Time</Text>
                <View style={styles.timePickerGrid}>
                  {TIME_OPTIONS.map((time) => (
                    <Pressable
                      key={`start-${time}`}
                      onPress={() => setDraft((current) => ({ ...current, start_time: time }))}
                      style={({ pressed }) => [
                        styles.timeChip,
                        draft.start_time === time ? styles.timeChipActive : null,
                        pressed ? styles.segmentOptionPressed : null,
                      ]}
                    >
                      <Text style={draft.start_time === time ? styles.timeChipTextActive : styles.timeChipText}>{time}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>End Time</Text>
                <View style={styles.timePickerGrid}>
                  {TIME_OPTIONS.map((time) => (
                    <Pressable
                      key={`end-${time}`}
                      onPress={() => setDraft((current) => ({ ...current, end_time: time }))}
                      style={({ pressed }) => [
                        styles.timeChip,
                        draft.end_time === time ? styles.timeChipActive : null,
                        pressed ? styles.segmentOptionPressed : null,
                      ]}
                    >
                      <Text style={draft.end_time === time ? styles.timeChipTextActive : styles.timeChipText}>{time}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Location</Text>
              <View style={styles.segmentedRow}>
                {LOCATION_OPTIONS.map((option) => (
                  <Pressable
                    key={`location-${option.id}`}
                    onPress={() => setDraft((current) => ({ ...current, location: option.id }))}
                    style={({ pressed }) => [
                      styles.segmentOption,
                      draft.location === option.id ? styles.segmentOptionActive : null,
                      pressed ? styles.segmentOptionPressed : null,
                    ]}
                  >
                    <Text style={draft.location === option.id ? styles.segmentOptionTextActive : styles.segmentOptionText}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {draft.location === 3 ? (
              <LabeledInput
                label="Other Location"
                value={draft.location_others || ''}
                onChangeText={(value) => setDraft((current) => ({ ...current, location_others: value }))}
                placeholder="Partner office / customer site"
              />
            ) : null}

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Status</Text>
              <View style={styles.segmentedRow}>
                {STATUS_OPTIONS.map((option) => (
                  <Pressable
                    key={`status-${option.id}`}
                    onPress={() => setDraft((current) => ({ ...current, status: option.id }))}
                    style={({ pressed }) => [
                      styles.segmentOption,
                      draft.status === option.id ? styles.segmentOptionActive : null,
                      pressed ? styles.segmentOptionPressed : null,
                    ]}
                  >
                    <Text style={draft.status === option.id ? styles.segmentOptionTextActive : styles.segmentOptionText}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <LabeledInput
              label="Agenda"
              value={draft.agenda}
              onChangeText={(value) => setDraft((current) => ({ ...current, agenda: value }))}
              placeholder="Discuss renewal scope, blockers, and next action"
              multiline
            />

            <LabeledInput
              label="Description"
              value={draft.description || ''}
              onChangeText={(value) => setDraft((current) => ({ ...current, description: value }))}
              placeholder="Meeting description or result summary"
              multiline
            />

            <LabeledInput
              label="Meeting URL"
              value={draft.url || ''}
              onChangeText={(value) => setDraft((current) => ({ ...current, url: value }))}
              placeholder="Optional meeting link"
              autoCapitalize="none"
            />
          </ScrollView>

          <View style={styles.modalFooterRow}>
            <Pressable onPress={onClose} style={styles.secondaryButtonMuted}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              disabled={submitting}
              onPress={onSubmit}
              style={({ pressed }) => [
                styles.primaryButtonSmall,
                pressed && !submitting ? styles.primaryButtonPressed : null,
                submitting ? styles.buttonDisabled : null,
              ]}
            >
              {submitting ? <ActivityIndicator color="#F8FAFC" /> : <Text style={styles.primaryButtonText}>{mode === 'edit' ? 'Save Visit Plan' : 'Create Visit Plan'}</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}