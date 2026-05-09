import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { checkInVisit, checkOutVisit, upsertVisit, upsertVisitOutcome } from '../lib/cockpit';
import type { CockpitUser, CockpitVisit } from '../types';

type OutcomeResult = 'positive' | 'neutral' | 'negative' | 'no_show';

type Props = {
  visit: CockpitVisit | null;
  user: CockpitUser;
  visible: boolean;
  onClose: () => void;
  onUpdated: () => void;
};

function fmtDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function fmtTime(t: string | null | undefined) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function statusColor(status: CockpitVisit['status'], theme: ReturnType<typeof useTheme>['theme']) {
  switch (status) {
    case 'scheduled': return theme.info;
    case 'in_progress': return theme.warning;
    case 'completed': return theme.success;
    case 'missed': return theme.error;
  }
}

const OUTCOME_OPTIONS: { id: OutcomeResult; label: string; emoji: string }[] = [
  { id: 'positive', label: 'Positive', emoji: '✅' },
  { id: 'neutral', label: 'Neutral', emoji: '⚪' },
  { id: 'negative', label: 'Negative', emoji: '❌' },
  { id: 'no_show', label: 'No Show', emoji: '🚫' },
];

export default function VisitDetailModal({ visit, user, visible, onClose, onUpdated }: Props) {
  const { theme } = useTheme();
  const [acting, setActing] = useState(false);

  // Outcome form state
  const [showOutcome, setShowOutcome] = useState(false);
  const [outcomeResult, setOutcomeResult] = useState<OutcomeResult | null>(null);
  const [outcomeSummary, setOutcomeSummary] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [nextVisitDate, setNextVisitDate] = useState('');
  const [savingOutcome, setSavingOutcome] = useState(false);

  // Reset state when visit changes
  useEffect(() => {
    if (visit) {
      setShowOutcome(false);
      setOutcomeResult(null);
      setOutcomeSummary('');
      setNextAction('');
      setNextVisitDate('');
      setActing(false);
    }
  }, [visit?._id]);

  if (!visit) return null;

  const canCheckIn = visit.status === 'scheduled';
  const canCheckOut = visit.status === 'in_progress';
  const canMarkMissed = visit.status === 'scheduled' || visit.status === 'in_progress';
  const canAddOutcome = visit.status === 'completed' || visit.status === 'in_progress';

  const handleCheckIn = async () => {
    setActing(true);
    try {
      const now = new Date().toISOString();
      await checkInVisit(visit._id, { lat: 0, lng: 0 }, now);
      onUpdated();
    } catch {
      Alert.alert('Error', 'Check-in failed. Try again.');
    } finally {
      setActing(false);
    }
  };

  const handleCheckOut = async () => {
    setActing(true);
    try {
      const now = new Date().toISOString();
      await checkOutVisit(visit._id, now);
      onUpdated();
      if (canAddOutcome) setShowOutcome(true);
    } catch {
      Alert.alert('Error', 'Check-out failed. Try again.');
    } finally {
      setActing(false);
    }
  };

  const handleMarkMissed = () => {
    Alert.alert('Mark as Missed?', 'This visit will be marked as missed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark Missed',
        style: 'destructive',
        onPress: async () => {
          setActing(true);
          try {
            await upsertVisit({ _id: visit._id, status: 'missed' });
            onUpdated();
          } catch {
            Alert.alert('Error', 'Could not update visit.');
          } finally {
            setActing(false);
          }
        },
      },
    ]);
  };

  const handleSaveOutcome = async () => {
    if (!outcomeResult) {
      Alert.alert('Required', 'Please select an outcome result.');
      return;
    }
    setSavingOutcome(true);
    try {
      await upsertVisitOutcome({
        visit: { _id: visit._id, title: visit.title },
        result: outcomeResult,
        summary: outcomeSummary.trim() || undefined,
        next_action: nextAction.trim() || undefined,
        next_visit_date: nextVisitDate.trim() || undefined,
        submitted_by: { _id: user._id, name: user.name },
        submitted_at: new Date().toISOString(),
      });
      setShowOutcome(false);
      onUpdated();
    } catch {
      Alert.alert('Error', 'Could not save outcome.');
    } finally {
      setSavingOutcome(false);
    }
  };

  const s = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '92%',
    },
    handle: {
      width: 40, height: 4, borderRadius: 2,
      backgroundColor: theme.border,
      alignSelf: 'center',
      marginTop: 10, marginBottom: 4,
    },
    headerRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: theme.border,
    },
    headerTitle: { fontSize: 16, fontWeight: '700', color: theme.text, flex: 1, marginRight: 8 },
    closeBtnText: { fontSize: 22, color: theme.textSecondary },
    statusBadge: {
      paddingHorizontal: 10, paddingVertical: 4,
      borderRadius: 12,
    },
    statusText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
    body: { padding: 16 },
    metaRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
    metaIcon: { fontSize: 15, width: 22, marginTop: 1 },
    metaText: { fontSize: 14, color: theme.text, flex: 1 },
    metaSecondary: { fontSize: 13, color: theme.textSecondary, flex: 1 },
    sectionTitle: {
      fontSize: 12, fontWeight: '700', color: theme.textSecondary,
      textTransform: 'uppercase', letterSpacing: 0.5,
      marginTop: 16, marginBottom: 8,
    },
    agendaBox: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: 10, padding: 12,
    },
    agendaText: { fontSize: 14, color: theme.text, lineHeight: 20 },
    actionsRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
    actionBtn: {
      flex: 1, paddingVertical: 13, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center',
    },
    actionBtnText: { fontSize: 14, fontWeight: '700' },
    // outcome
    outcomeSection: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: 12, padding: 14, marginTop: 16,
    },
    outcomeSectionTitle: {
      fontSize: 14, fontWeight: '700', color: theme.text, marginBottom: 12,
    },
    outcomeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    outcomeChip: {
      paddingHorizontal: 12, paddingVertical: 7,
      borderRadius: 20, borderWidth: 1.5, borderColor: theme.border,
      flexDirection: 'row', alignItems: 'center', gap: 4,
    },
    outcomeChipActive: { borderColor: theme.primary, backgroundColor: theme.primary },
    outcomeChipText: { fontSize: 13, fontWeight: '500', color: theme.textSecondary },
    outcomeChipTextActive: { color: '#FFFFFF', fontWeight: '600' },
    label: {
      fontSize: 12, fontWeight: '600', color: theme.textSecondary,
      textTransform: 'uppercase', letterSpacing: 0.4,
      marginBottom: 4, marginTop: 10,
    },
    input: {
      backgroundColor: theme.surface,
      borderWidth: 1, borderColor: theme.inputBorder,
      borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9,
      fontSize: 14, color: theme.text,
    },
    textArea: { minHeight: 70, textAlignVertical: 'top' },
    saveOutcomeBtn: {
      backgroundColor: theme.success, borderRadius: 12,
      paddingVertical: 13, alignItems: 'center', marginTop: 14,
    },
    saveOutcomeBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.handle} />
          <View style={s.headerRow}>
            <Text style={s.headerTitle} numberOfLines={2}>{visit.title}</Text>
            <View style={[s.statusBadge, { backgroundColor: statusColor(visit.status, theme) }]}>
              <Text style={s.statusText}>{visit.status.replace('_', ' ')}</Text>
            </View>
            <Pressable onPress={onClose} style={{ marginLeft: 10 }} hitSlop={10}>
              <Text style={s.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={s.body} keyboardShouldPersistTaps="handled">
            {visit.client?.name && (
              <View style={s.metaRow}>
                <Text style={s.metaIcon}>🏢</Text>
                <Text style={s.metaText}>{visit.client.name}</Text>
              </View>
            )}
            <View style={s.metaRow}>
              <Text style={s.metaIcon}>📅</Text>
              <Text style={s.metaText}>
                {fmtDate(visit.date)}
                {visit.start_time ? ` · ${fmtTime(visit.start_time)}` : ''}
                {visit.end_time ? ` – ${fmtTime(visit.end_time)}` : ''}
              </Text>
            </View>
            {visit.location && (
              <View style={s.metaRow}>
                <Text style={s.metaIcon}>📍</Text>
                <Text style={s.metaSecondary}>{visit.location}</Text>
              </View>
            )}
            {visit.assigned_am?.name && (
              <View style={s.metaRow}>
                <Text style={s.metaIcon}>👤</Text>
                <Text style={s.metaSecondary}>{visit.assigned_am.name}</Text>
              </View>
            )}
            {visit.checkin_at && (
              <View style={s.metaRow}>
                <Text style={s.metaIcon}>✅</Text>
                <Text style={s.metaSecondary}>
                  Checked in: {new Date(visit.checkin_at).toLocaleTimeString()}
                </Text>
              </View>
            )}
            {visit.checkout_at && (
              <View style={s.metaRow}>
                <Text style={s.metaIcon}>🏁</Text>
                <Text style={s.metaSecondary}>
                  Checked out: {new Date(visit.checkout_at).toLocaleTimeString()}
                </Text>
              </View>
            )}

            {visit.agenda ? (
              <>
                <Text style={s.sectionTitle}>Agenda</Text>
                <View style={s.agendaBox}>
                  <Text style={s.agendaText}>{visit.agenda}</Text>
                </View>
              </>
            ) : null}

            {/* Action buttons */}
            {acting
              ? <ActivityIndicator color={theme.primary} style={{ marginTop: 24 }} />
              : (
                <View style={s.actionsRow}>
                  {canCheckIn && (
                    <Pressable
                      style={[s.actionBtn, { backgroundColor: theme.info }]}
                      onPress={handleCheckIn}
                    >
                      <Text style={[s.actionBtnText, { color: '#FFFFFF' }]}>Check In</Text>
                    </Pressable>
                  )}
                  {canCheckOut && (
                    <Pressable
                      style={[s.actionBtn, { backgroundColor: theme.success }]}
                      onPress={handleCheckOut}
                    >
                      <Text style={[s.actionBtnText, { color: '#FFFFFF' }]}>Check Out</Text>
                    </Pressable>
                  )}
                  {canMarkMissed && (
                    <Pressable
                      style={[s.actionBtn, { backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.error }]}
                      onPress={handleMarkMissed}
                    >
                      <Text style={[s.actionBtnText, { color: theme.error }]}>Missed</Text>
                    </Pressable>
                  )}
                  {canAddOutcome && !showOutcome && (
                    <Pressable
                      style={[s.actionBtn, { backgroundColor: theme.accent }]}
                      onPress={() => setShowOutcome(true)}
                    >
                      <Text style={[s.actionBtnText, { color: '#FFFFFF' }]}>Outcome</Text>
                    </Pressable>
                  )}
                </View>
              )
            }

            {/* Outcome form */}
            {showOutcome && (
              <View style={s.outcomeSection}>
                <Text style={s.outcomeSectionTitle}>Visit Outcome</Text>
                <View style={s.outcomeChips}>
                  {OUTCOME_OPTIONS.map((o) => (
                    <Pressable
                      key={o.id}
                      style={[s.outcomeChip, outcomeResult === o.id && s.outcomeChipActive]}
                      onPress={() => setOutcomeResult(o.id)}
                    >
                      <Text style={[s.outcomeChipText, outcomeResult === o.id && s.outcomeChipTextActive]}>
                        {o.emoji} {o.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={s.label}>Summary</Text>
                <TextInput
                  style={[s.input, s.textArea]}
                  value={outcomeSummary}
                  onChangeText={setOutcomeSummary}
                  placeholder="What happened during the visit?"
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={3}
                />

                <Text style={s.label}>Next Action</Text>
                <TextInput
                  style={s.input}
                  value={nextAction}
                  onChangeText={setNextAction}
                  placeholder="Follow-up task or note"
                  placeholderTextColor={theme.textSecondary}
                />

                <Text style={s.label}>Next Visit Date</Text>
                <TextInput
                  style={s.input}
                  value={nextVisitDate}
                  onChangeText={setNextVisitDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numbers-and-punctuation"
                />

                <Pressable
                  style={[s.saveOutcomeBtn, savingOutcome && { opacity: 0.6 }]}
                  onPress={handleSaveOutcome}
                  disabled={savingOutcome}
                >
                  {savingOutcome
                    ? <ActivityIndicator size="small" color="#FFFFFF" />
                    : <Text style={s.saveOutcomeBtnText}>Save Outcome</Text>
                  }
                </Pressable>
              </View>
            )}

            <View style={{ height: 30 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
