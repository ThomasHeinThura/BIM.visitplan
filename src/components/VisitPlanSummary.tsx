import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { styles } from '../styles';
import type { VisitPlan } from '../types';
import { STATUS_OPTIONS } from '../utils/visitplan';

export function VisitPlanSummary({
  selectedVisitPlan,
  meetingResultDraft,
  onChangeMeetingResult,
  onSaveMeetingResult,
  savingMeetingResult,
  updatingStatus,
  onStatusUpdate,
  onEditVisitPlan,
  onCreateVisitPlan,
  onLogout,
}: {
  selectedVisitPlan: VisitPlan | null;
  meetingResultDraft: string;
  onChangeMeetingResult: (value: string) => void;
  onSaveMeetingResult: () => void;
  savingMeetingResult: boolean;
  updatingStatus: number | null;
  onStatusUpdate: (status: number) => void;
  onEditVisitPlan: (visitPlan: VisitPlan) => void;
  onCreateVisitPlan: () => void;
  onLogout: () => void;
}) {
  if (!selectedVisitPlan) {
    return (
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Visit Plan Summary</Text>
        <Text style={styles.sectionSubtitle}>Select a visit plan from the calendar, or create a new one.</Text>
        <View style={styles.inlineButtonRow}>
          <Pressable onPress={onCreateVisitPlan} style={styles.primaryButtonSmall}>
            <Text style={styles.primaryButtonText}>Create Visit Plan</Text>
          </Pressable>
          <Pressable onPress={onLogout} style={styles.secondaryButtonMuted}>
            <Text style={styles.secondaryButtonText}>Logout</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.sideColumnStack}>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Visit Plan Summary</Text>
        <Text style={styles.detailTitle}>{selectedVisitPlan.title}</Text>
        <Text style={styles.detailMeta}>{selectedVisitPlan.client_name || 'No client selected'}</Text>
        <Text style={styles.detailMeta}>{selectedVisitPlan.date} | {selectedVisitPlan.start_time} - {selectedVisitPlan.end_time}</Text>
        <Text style={styles.detailMeta}>Location: {selectedVisitPlan.location}{selectedVisitPlan.location_others ? ` (${selectedVisitPlan.location_others})` : ''}</Text>
        <Text style={styles.detailMeta}>Creator: {selectedVisitPlan.creator?.name || 'Unknown'}</Text>

        <View style={styles.detailSectionCard}>
          <Text style={styles.detailSectionTitle}>Agenda</Text>
          <Text style={styles.detailBody}>{selectedVisitPlan.agenda}</Text>
        </View>

        <View style={styles.detailSectionCard}>
          <Text style={styles.detailSectionTitle}>Description</Text>
          <Text style={styles.detailBodyMuted}>{selectedVisitPlan.description || 'No description added yet.'}</Text>
        </View>

        {selectedVisitPlan.members.length > 0 ? (
          <View style={styles.detailSectionCard}>
            <Text style={styles.detailSectionTitle}>Assigned Members</Text>
            <View style={styles.selectionChipRow}>
              {selectedVisitPlan.members.map((member) => (
                <View key={member.id} style={styles.selectionChipStatic}>
                  <Text style={styles.selectionChipText}>{member.name}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.inlineButtonRow}>
          {selectedVisitPlan.permissions?.can_edit ? (
            <Pressable onPress={() => onEditVisitPlan(selectedVisitPlan)} style={styles.primaryButtonSmall}>
              <Text style={styles.primaryButtonText}>Edit Visit Plan</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={onCreateVisitPlan} style={styles.secondaryButtonMuted}>
            <Text style={styles.secondaryButtonText}>New Visit Plan</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Meeting Result</Text>
        <Text style={styles.sectionSubtitle}>Update the result, decisions, and next steps after the meeting.</Text>
        <TextInput
          value={meetingResultDraft}
          onChangeText={onChangeMeetingResult}
          editable={Boolean(selectedVisitPlan.permissions?.can_edit) && !savingMeetingResult}
          multiline
          placeholder="Add the meeting result here"
          placeholderTextColor="#94A3B8"
          style={[styles.input, styles.multilineInput, styles.meetingResultInput]}
        />
        {selectedVisitPlan.permissions?.can_edit ? (
          <Pressable
            onPress={onSaveMeetingResult}
            disabled={savingMeetingResult}
            style={({ pressed }) => [
              styles.primaryButtonSmall,
              styles.inlineActionButton,
              pressed && !savingMeetingResult ? styles.primaryButtonPressed : null,
              savingMeetingResult ? styles.buttonDisabled : null,
            ]}
          >
            {savingMeetingResult ? <ActivityIndicator color="#F8FAFC" /> : <Text style={styles.primaryButtonText}>Save Meeting Result</Text>}
          </Pressable>
        ) : null}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Status Update</Text>
        <View style={styles.statusUpdateRow}>
          {STATUS_OPTIONS.map((status) => (
            <Pressable
              key={status.id}
              onPress={() => onStatusUpdate(status.id)}
              disabled={updatingStatus !== null || !selectedVisitPlan.permissions?.can_update_status}
              style={({ pressed }) => [
                styles.statusAction,
                selectedVisitPlan.status_id === status.id ? styles.statusActionActive : null,
                pressed ? styles.statusActionPressed : null,
                updatingStatus !== null || !selectedVisitPlan.permissions?.can_update_status ? styles.buttonDisabled : null,
              ]}
            >
              <Text style={selectedVisitPlan.status_id === status.id ? styles.statusActionTextActive : styles.statusActionText}>
                {updatingStatus === status.id ? 'Updating...' : status.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}