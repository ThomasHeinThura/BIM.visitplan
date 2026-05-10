import React, { useEffect, useMemo, useState } from 'react';
import {
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
import { formatDisplayTime, getOfficeTimeOptions, isOutsideOfficeHours } from '../utils/schedule';
import { buildCalendarDays, formatCalendarHeader, getMonthStart } from '../utils/visitplan';
import { Icon, PrimaryButton, SecondaryButton } from './ui';

export type EditVisitContext = {
  id: string;
  client: string;
  date: string;
  time: string;
  status: VisitStatus;
};

export type VisitStatus = 'planned' | 'active' | 'done' | 'noshow' | 'rescheduled' | 'cancelled';
export type VisitOutcome = 'positive' | 'neutral' | 'negative' | 'pending';

const STATUSES: { id: VisitStatus; label: string; emoji: string }[] = [
  { id: 'planned', label: 'Planned', emoji: '🗓' },
  { id: 'active', label: 'Active', emoji: '🟢' },
  { id: 'done', label: 'Done', emoji: '✅' },
  { id: 'noshow', label: 'No-show', emoji: '⚠️' },
  { id: 'rescheduled', label: 'Rescheduled', emoji: '↻' },
  { id: 'cancelled', label: 'Cancelled', emoji: '✖' },
];

const OUTCOMES: { id: VisitOutcome; label: string; emoji: string }[] = [
  { id: 'positive', label: 'Positive', emoji: '✅' },
  { id: 'neutral', label: 'Neutral', emoji: '🟡' },
  { id: 'negative', label: 'Negative', emoji: '🔴' },
  { id: 'pending', label: 'Pending', emoji: '⏳' },
];

const OFFICE_TIME_OPTIONS = getOfficeTimeOptions();

type Props = {
  visible: boolean;
  visit: EditVisitContext | null;
  onClose: () => void;
  onSave: (patch: {
    id: string;
    status: VisitStatus;
    outcome: VisitOutcome;
    pipelineUsd: string;
    notes: string;
    rescheduleDate: string;
    rescheduleTime: string;
  }) => void;
  onDelete?: (id: string) => void;
};

export default function EditVisitModal({ visible, visit, onClose, onSave, onDelete }: Props) {
  const { theme } = useTheme();
  const [status, setStatus] = useState<VisitStatus>('planned');
  const [outcome, setOutcome] = useState<VisitOutcome>('pending');
  const [pipeline, setPipeline] = useState('');
  const [notes, setNotes] = useState('');
  const [rDate, setRDate] = useState('');
  const [rTime, setRTime] = useState('');
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(() => getMonthStart(new Date()));
  const showReschedule = status === 'rescheduled';

  useEffect(() => {
    if (visit) {
      setStatus(visit.status || 'planned');
      setOutcome('pending');
      setPipeline('');
      setNotes('');
      setRDate(visit.date || '');
      setRTime(visit.time || '09:00');
      setDatePickerOpen(false);
      setTimePickerOpen(false);
      const nextDate = visit.date ? new Date(`${visit.date}T00:00:00`) : new Date();
      setPickerMonth(getMonthStart(nextDate));
    }
  }, [visit?.id, visible]);

  useEffect(() => {
    if (!showReschedule) {
      setDatePickerOpen(false);
      setTimePickerOpen(false);
    }
  }, [showReschedule]);

  const calendarDays = useMemo(() => buildCalendarDays(pickerMonth, []), [pickerMonth]);
  const hasOfficeHourWarning = showReschedule && !!rTime && isOutsideOfficeHours(rTime);

  if (!visit) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[s.backdrop, { backgroundColor: 'rgba(0,0,0,0.62)' }]}>
        <View style={[s.sheet, { backgroundColor: theme.bg }]}>
          <View style={s.handleWrap}>
            <View style={[s.handle, { backgroundColor: theme.border }]} />
          </View>

          <View style={s.header}>
            <Text style={[s.title, { color: theme.text }]}>Edit Visit</Text>
            <Pressable onPress={onClose} hitSlop={10} style={[s.closeBtn, { backgroundColor: theme.surfaceOffset }]}>
              <Text style={[s.close, { color: theme.textSecondary }]}>×</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}>
            <Text style={[s.client, { color: theme.text }]}>{visit.client}</Text>
            <Text style={[s.context, { color: theme.textSecondary }]}>
              {visit.date} · {visit.time}
            </Text>

            <Label theme={theme}>Status</Label>
            <View style={s.chips}>
              {STATUSES.map((opt) => {
                const active = status === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => setStatus(opt.id)}
                    style={[
                      s.chip,
                      {
                        backgroundColor: active ? theme.primary : theme.surfaceOffset,
                        borderColor: active ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: active ? '#fff' : theme.textSecondary, fontFamily: fonts.display }}>
                      {opt.emoji} {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Label theme={theme}>Outcome</Label>
            <View style={s.chips}>
              {OUTCOMES.map((opt) => {
                const active = outcome === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => setOutcome(opt.id)}
                    style={[
                      s.chip,
                      {
                        backgroundColor: active ? theme.primary : theme.surfaceOffset,
                        borderColor: active ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: active ? '#fff' : theme.textSecondary, fontFamily: fonts.display }}>
                      {opt.emoji} {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Label theme={theme}>Pipeline value (USD)</Label>
            <TextInput
              value={pipeline}
              onChangeText={setPipeline}
              placeholder="e.g. 24000"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
              style={[s.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
            />

            <Label theme={theme}>Notes</Label>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Outcome details, next steps…"
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={4}
              style={[s.input, s.textarea, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
            />

            {showReschedule ? (
              <>
                <Label theme={theme}>Reschedule to</Label>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    onPress={() => setDatePickerOpen((current) => !current)}
                    style={[s.input, s.pickerTrigger, { flex: 1, backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}
                  >
                    <Text style={{ fontSize: 13, color: rDate ? theme.text : theme.textSecondary, fontFamily: fonts.display, fontWeight: '600' }}>
                      {rDate || 'YYYY-MM-DD'}
                    </Text>
                    <Icon.Calendar size={16} color={theme.textSecondary} />
                  </Pressable>
                  <Pressable
                    onPress={() => setTimePickerOpen((current) => !current)}
                    style={[s.input, s.pickerTrigger, { width: 134, backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}
                  >
                    <Text style={{ fontSize: 13, color: rTime ? theme.text : theme.textSecondary, fontFamily: fonts.display, fontWeight: '600' }}>
                      {rTime ? formatDisplayTime(rTime) : 'HH:MM'}
                    </Text>
                    <Icon.Clock size={16} color={theme.textSecondary} />
                  </Pressable>
                </View>
                {hasOfficeHourWarning ? (
                  <View style={[s.warningCard, { backgroundColor: theme.warningLight, borderColor: theme.warning }]}>
                    <Text style={[s.warningText, { color: theme.text }]}>Office hours are 9:00 AM to 5:00 PM. This rescheduled time is outside office hours.</Text>
                  </View>
                ) : null}
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
                          const active = rDate === day.isoDate;
                          return (
                            <Pressable
                              key={day.isoDate}
                              onPress={() => {
                                setRDate(day.isoDate);
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
                {timePickerOpen ? (
                  <View style={[s.pickerCard, { marginTop: 8, padding: 8, backgroundColor: theme.surfaceOffset, borderColor: theme.border, borderWidth: 1 }]}>
                    <Text style={{ fontSize: 12, color: theme.textSecondary, fontWeight: '700', marginBottom: 8 }}>Choose time</Text>
                    <View style={s.timeOptionGrid}>
                      {OFFICE_TIME_OPTIONS.map((timeValue) => {
                        const active = rTime === timeValue;
                        return (
                          <Pressable
                            key={timeValue}
                            onPress={() => {
                              setRTime(timeValue);
                              setTimePickerOpen(false);
                            }}
                            style={[s.chip, { backgroundColor: active ? theme.primary : theme.surfaceOffset, borderColor: active ? theme.primary : theme.border }]}
                          >
                            <Text style={{ fontSize: 11, fontWeight: '700', color: active ? '#fff' : theme.textSecondary, fontFamily: fonts.display }}>{formatDisplayTime(timeValue)}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <View style={{ marginTop: 10 }}>
                      <SecondaryButton label="Close" onPress={() => setTimePickerOpen(false)} />
                    </View>
                  </View>
                ) : null}
              </>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
              <View style={{ flex: 1 }}>
                <SecondaryButton label="Cancel" onPress={onClose} />
              </View>
              <View style={{ flex: 2 }}>
                <PrimaryButton
                  label="Save changes"
                  onPress={() => {
                    if (showReschedule && isOutsideOfficeHours(rTime)) {
                      Alert.alert('Outside office hours', 'Rescheduled time must be between 9:00 AM and 5:00 PM.');
                      return;
                    }
                    onSave({
                      id: visit.id,
                      status,
                      outcome,
                      pipelineUsd: pipeline,
                      notes,
                      rescheduleDate: rDate,
                      rescheduleTime: rTime,
                    });
                  }}
                />
              </View>
            </View>
            {onDelete ? (
              <Pressable
                onPress={() => onDelete(visit.id)}
                style={[s.btn, { marginTop: 10, borderColor: theme.error, backgroundColor: 'transparent' }]}
              >
                <Text style={{ color: theme.error, fontWeight: '700' }}>Delete visit</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Label({ children, theme }: { children: React.ReactNode; theme: any }) {
  return (
    <Text
      style={{
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        color: theme.textSecondary,
        marginTop: 14,
        marginBottom: 6,
      }}
    >
      {children}
    </Text>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, maxHeight: '92%', paddingTop: 8, paddingBottom: 28 },
  handleWrap: { alignItems: 'center', paddingTop: 8 },
  handle: { width: 36, height: 4, borderRadius: radii.full },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  title: { fontSize: 16, fontWeight: '700', fontFamily: fonts.display },
  closeBtn: { width: 28, height: 28, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center' },
  close: { fontSize: 18, lineHeight: 18 },
  client: { fontSize: 16, fontWeight: '700', fontFamily: fonts.display },
  context: { fontSize: 12, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radii.full, borderWidth: 1 },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  pickerCard: { borderRadius: radii.md },
  warningCard: { borderRadius: radii.md, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, marginTop: 8, marginBottom: 4 },
  warningText: { fontSize: 11, lineHeight: 16 },
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
  btn: {
    paddingVertical: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
