import React, { useEffect, useMemo, useState } from 'react';
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
import { useTheme, fonts, radii } from '../context/ThemeContext';
import { Icon, PrimaryButton, SecondaryButton } from './ui';
import { checkInVisit, checkOutVisit, upsertVisit, upsertVisitOutcome } from '../lib/cockpit';
import type { CockpitUser, CockpitVisit } from '../types';
import { formatDisplayTime, getOfficeTimeOptions, isOutsideOfficeHours } from '../utils/schedule';
import { buildCalendarDays, formatCalendarHeader, getMonthStart } from '../utils/visitplan';

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

const OFFICE_TIME_OPTIONS = getOfficeTimeOptions();

export default function VisitDetailModal({ visit, user, visible, onClose, onUpdated }: Props) {
  const { theme } = useTheme();
  const [acting, setActing] = useState(false);
  const [showMissedChoices, setShowMissedChoices] = useState(false);

  // Outcome form state
  const [showOutcome, setShowOutcome] = useState(false);
  const [outcomeResult, setOutcomeResult] = useState<OutcomeResult | null>(null);
  const [outcomeSummary, setOutcomeSummary] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [nextVisitDate, setNextVisitDate] = useState('');
  const [nextVisitTime, setNextVisitTime] = useState('');
  const [savingOutcome, setSavingOutcome] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(() => getMonthStart(new Date()));

  // Reset state when visit changes
  useEffect(() => {
    if (visit) {
      setShowOutcome(false);
      setOutcomeResult(null);
      setOutcomeSummary('');
      setNextAction('');
      setNextVisitDate('');
      setNextVisitTime('');
      setActing(false);
      setShowMissedChoices(false);
      setDatePickerOpen(false);
      setTimePickerOpen(false);
      setPickerMonth(getMonthStart(new Date()));
    }
  }, [visit?._id]);

  const calendarDays = useMemo(() => buildCalendarDays(pickerMonth, []), [pickerMonth]);

  if (!visit) return null;

  const canCheckIn = visit.status === 'scheduled';
  const canCheckOut = visit.status === 'in_progress';
  const canMarkMissed = visit.status === 'scheduled' || visit.status === 'in_progress';
  const canAddOutcome = visit.status === 'completed' || visit.status === 'in_progress';
  const hasOfficeHourWarning = !!nextVisitTime && isOutsideOfficeHours(nextVisitTime);

  const markVisitMissed = async (afterMark?: () => void) => {
    setActing(true);
    try {
      await upsertVisit({ _id: visit._id, status: 'missed' });
      afterMark?.();
      onUpdated();
    } catch {
      Alert.alert('Error', 'Could not update visit.');
    } finally {
      setActing(false);
    }
  };

  const handleCheckIn = async () => {
    setShowMissedChoices(false);
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
    setShowMissedChoices(false);
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
    setShowMissedChoices(true);
    setShowOutcome(false);
  };

  const handleSaveOutcome = async () => {
    if (!outcomeResult) {
      Alert.alert('Required', 'Please select an outcome result.');
      return;
    }
    if (nextVisitTime && isOutsideOfficeHours(nextVisitTime)) {
      Alert.alert('Outside office hours', 'Next visit time must be between 9:00 AM and 5:00 PM.');
      return;
    }
    setSavingOutcome(true);
    try {
      await upsertVisitOutcome({
        visit: { _id: visit._id, title: visit.title },
        result: outcomeResult,
        summary: outcomeSummary.trim() || undefined,
        next_action: nextAction.trim() || undefined,
        next_visit_date: nextVisitDate.trim() ? `${nextVisitDate.trim()}${nextVisitTime ? ` ${nextVisitTime}` : ''}` : undefined,
        submitted_by: { _id: user._id, name: user.name },
        submitted_at: new Date().toISOString(),
      });
      setShowOutcome(false);
      setNextVisitTime('');
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
      backgroundColor: 'rgba(0,0,0,0.62)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: theme.bg,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      maxHeight: '92%',
      paddingBottom: 28,
    },
    handle: {
      width: 36, height: 4, borderRadius: radii.full,
      backgroundColor: theme.border,
      alignSelf: 'center',
      marginTop: 10, marginBottom: 8,
    },
    headerRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingBottom: 10,
    },
    headerTitle: { fontSize: 16, fontWeight: '700', color: theme.text, flex: 1, marginRight: 8, fontFamily: fonts.display },
    closeBtnText: { fontSize: 18, color: theme.textSecondary, lineHeight: 18 },
    statusBadge: {
      paddingHorizontal: 10, paddingVertical: 4,
      borderRadius: radii.full,
    },
    statusText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
    body: { paddingHorizontal: 20 },
    metaRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
    metaIconWrap: { width: 22, marginTop: 1, alignItems: 'center' },
    metaText: { fontSize: 14, color: theme.text, flex: 1 },
    metaSecondary: { fontSize: 13, color: theme.textSecondary, flex: 1 },
    sectionTitle: {
      fontSize: 12, fontWeight: '700', color: theme.textSecondary,
      textTransform: 'uppercase', letterSpacing: 0.5,
      marginTop: 16, marginBottom: 8,
    },
    agendaBox: {
      backgroundColor: theme.surface,
      borderRadius: radii.md, padding: 12,
      borderWidth: 1, borderColor: theme.border,
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
      backgroundColor: theme.surface,
      borderRadius: radii.md, padding: 14, marginTop: 16,
      borderWidth: 1, borderColor: theme.border,
    },
    outcomeSectionTitle: {
      fontSize: 14, fontWeight: '700', color: theme.text, marginBottom: 12, fontFamily: fonts.display,
    },
    outcomeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    outcomeChip: {
      paddingHorizontal: 12, paddingVertical: 7,
      borderRadius: radii.full, borderWidth: 1.5, borderColor: theme.border,
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
      borderRadius: radii.md, paddingHorizontal: 10, paddingVertical: 10,
      fontSize: 14, color: theme.text,
    },
    textArea: { minHeight: 70, textAlignVertical: 'top' },
    saveOutcomeBtn: {
      backgroundColor: theme.success, borderRadius: radii.md,
      paddingVertical: 13, alignItems: 'center', marginTop: 14,
    },
    saveOutcomeBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
    pickerTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    pickerCard: { borderRadius: radii.md },
    warningCard: {
      backgroundColor: theme.warningLight,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: theme.warning,
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginTop: 8,
      marginBottom: 4,
    },
    warningText: { fontSize: 11, color: theme.text, lineHeight: 16 },
    calendarInner: { width: '100%', maxWidth: 320, alignSelf: 'center' },
    calendarNavRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    calendarActionRow: { flexDirection: 'row', gap: 8 },
    calendarActionBtn: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: radii.full, borderWidth: 1 },
    calendarMonthTitle: { fontSize: 11, fontWeight: '700', fontFamily: fonts.display, marginBottom: 5 },
    calendarWeekHeaderRow: { flexDirection: 'row', marginBottom: 2 },
    calendarWeekHeaderText: { flex: 1, textAlign: 'center', fontSize: 8, fontWeight: '700' },
    calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
    calendarCell: { width: '13.5%', aspectRatio: 1, borderRadius: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    calendarCellMuted: { opacity: 0.45 },
    timeOptionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
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
            <Pressable onPress={onClose} style={{ marginLeft: 10, width: 28, height: 28, borderRadius: radii.full, backgroundColor: theme.surfaceOffset, alignItems: 'center', justifyContent: 'center' }} hitSlop={10}>
              <Text style={s.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={s.body} keyboardShouldPersistTaps="handled">
            {visit.client?.name && (
              <View style={s.metaRow}>
                <View style={s.metaIconWrap}><Icon.Building size={14} color={theme.textFaint} /></View>
                <Text style={s.metaText}>{visit.client.name}</Text>
              </View>
            )}
            <View style={s.metaRow}>
              <View style={s.metaIconWrap}><Icon.Calendar size={14} color={theme.textFaint} /></View>
              <Text style={s.metaText}>
                {fmtDate(visit.date)}
                {visit.start_time ? ` · ${fmtTime(visit.start_time)}` : ''}
                {visit.end_time ? ` – ${fmtTime(visit.end_time)}` : ''}
              </Text>
            </View>
            {visit.location && (
              <View style={s.metaRow}>
                <View style={s.metaIconWrap}><Icon.MapPin size={14} color={theme.textFaint} /></View>
                <Text style={s.metaSecondary}>{visit.location}</Text>
              </View>
            )}
            {visit.assigned_am?.name && (
              <View style={s.metaRow}>
                <View style={s.metaIconWrap}><Icon.User size={14} color={theme.textFaint} /></View>
                <Text style={s.metaSecondary}>{visit.assigned_am.name}</Text>
              </View>
            )}
            {visit.checkin_at && (
              <View style={s.metaRow}>
                <View style={s.metaIconWrap}><Icon.Check size={14} color={theme.success} /></View>
                <Text style={s.metaSecondary}>
                  Checked in: {new Date(visit.checkin_at).toLocaleTimeString()}
                </Text>
              </View>
            )}
            {visit.checkout_at && (
              <View style={s.metaRow}>
                <View style={s.metaIconWrap}><Icon.Clock size={14} color={theme.textFaint} /></View>
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
                    <View style={{ flex: 1 }}>
                      <PrimaryButton label="Check In" onPress={handleCheckIn} />
                    </View>
                  )}
                  {canCheckOut && (
                    <View style={{ flex: 1 }}>
                      <PrimaryButton label="Check Out" onPress={handleCheckOut} />
                    </View>
                  )}
                  {canMarkMissed && (
                    <View style={{ flex: 1 }}>
                      <SecondaryButton label="Missed" onPress={handleMarkMissed} />
                    </View>
                  )}
                  {canAddOutcome && !showOutcome && (
                    <View style={{ flex: 1 }}>
                      <PrimaryButton label="Outcome" onPress={() => setShowOutcome(true)} />
                    </View>
                  )}
                </View>
              )
            }

            {showMissedChoices ? (
              <View style={s.outcomeSection}>
                <Text style={s.outcomeSectionTitle}>Missed Visit</Text>
                <Text style={{ fontSize: 13, color: theme.textSecondary, lineHeight: 19, marginBottom: 12 }}>
                  Choose what should happen for this missed visit.
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <SecondaryButton label="Close" onPress={() => setShowMissedChoices(false)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <SecondaryButton
                      label="Project Cancel"
                      onPress={() => void markVisitMissed(() => setShowMissedChoices(false))}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <PrimaryButton
                      label="Reschedule Later"
                      onPress={() => void markVisitMissed(() => {
                        setShowMissedChoices(false);
                        setOutcomeResult('no_show');
                        setNextAction((current) => current || 'Reschedule later');
                        setShowOutcome(true);
                      })}
                    />
                  </View>
                </View>
              </View>
            ) : null}

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
                <Pressable
                  onPress={() => setDatePickerOpen((current) => !current)}
                  style={[s.input, s.pickerTrigger]}
                >
                  <Text style={{ fontSize: 13, color: nextVisitDate ? theme.text : theme.textSecondary, fontFamily: fonts.display, fontWeight: '600' }}>
                    {nextVisitDate || 'YYYY-MM-DD'}
                  </Text>
                  <Icon.Calendar size={16} color={theme.textSecondary} />
                </Pressable>
                {datePickerOpen ? (
                  <View style={[s.pickerCard, { marginTop: 8, padding: 8, backgroundColor: theme.surfaceOffset, borderColor: theme.border, borderWidth: 1 }]}> 
                    <View style={s.calendarInner}>
                      <View style={s.calendarNavRow}>
                        <Text style={{ fontSize: 11, color: theme.textSecondary, fontWeight: '700' }}>Choose date</Text>
                        <View style={s.calendarActionRow}>
                          <Pressable onPress={() => setPickerMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} style={[s.calendarActionBtn, { borderColor: theme.border, backgroundColor: theme.bg }]}> 
                            <Text style={{ fontSize: 11, color: theme.text }}>Prev</Text>
                          </Pressable>
                          <Pressable onPress={() => setPickerMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} style={[s.calendarActionBtn, { borderColor: theme.border, backgroundColor: theme.bg }]}> 
                            <Text style={{ fontSize: 11, color: theme.text }}>Next</Text>
                          </Pressable>
                        </View>
                      </View>
                      <Text style={[s.calendarMonthTitle, { color: theme.text }]}>{formatCalendarHeader(pickerMonth)}</Text>
                      <View style={s.calendarWeekHeaderRow}>
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                          <Text key={day} style={[s.calendarWeekHeaderText, { color: theme.textSecondary }]}>{day}</Text>
                        ))}
                      </View>
                      <View style={s.calendarGrid}>
                        {calendarDays.map((day) => {
                          const active = nextVisitDate === day.isoDate;
                          return (
                            <Pressable
                              key={day.isoDate}
                              onPress={() => {
                                setNextVisitDate(day.isoDate);
                                setDatePickerOpen(false);
                              }}
                              style={[
                                s.calendarCell,
                                { backgroundColor: theme.bg, borderColor: theme.border },
                                !day.isCurrentMonth && s.calendarCellMuted,
                                active && { backgroundColor: theme.primaryLight, borderColor: theme.primary },
                              ]}
                            >
                              <Text style={{ fontSize: 9, color: active ? theme.primary : theme.textSecondary, fontWeight: active ? '700' : '500' }}>{day.dayOfMonth}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                ) : null}

                <Text style={s.label}>Next Visit Time</Text>
                <Pressable
                  onPress={() => setTimePickerOpen((current) => !current)}
                  style={[s.input, s.pickerTrigger]}
                >
                  <Text style={{ fontSize: 13, color: nextVisitTime ? theme.text : theme.textSecondary, fontFamily: fonts.display, fontWeight: '600' }}>
                    {nextVisitTime ? formatDisplayTime(nextVisitTime) : 'HH:MM'}
                  </Text>
                  <Icon.Clock size={16} color={theme.textSecondary} />
                </Pressable>
                {hasOfficeHourWarning ? (
                  <View style={s.warningCard}>
                    <Text style={s.warningText}>Office hours are 9:00 AM to 5:00 PM. This next visit time is outside office hours.</Text>
                  </View>
                ) : null}
                {timePickerOpen ? (
                  <View style={[s.pickerCard, { marginTop: 8, padding: 8, backgroundColor: theme.surfaceOffset, borderColor: theme.border, borderWidth: 1 }]}> 
                    <Text style={{ fontSize: 12, color: theme.textSecondary, fontWeight: '700', marginBottom: 8 }}>Choose time</Text>
                    <View style={s.timeOptionGrid}>
                      {OFFICE_TIME_OPTIONS.map((timeValue) => {
                        const active = nextVisitTime === timeValue;
                        return (
                          <Pressable
                            key={timeValue}
                            onPress={() => {
                              setNextVisitTime(timeValue);
                              setTimePickerOpen(false);
                            }}
                            style={[s.outcomeChip, active && s.outcomeChipActive]}
                          >
                            <Text style={[s.outcomeChipText, active && s.outcomeChipTextActive]}>
                              {formatDisplayTime(timeValue)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <View style={{ marginTop: 10 }}>
                      <SecondaryButton label="Close" onPress={() => setTimePickerOpen(false)} />
                    </View>
                  </View>
                ) : null}

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
