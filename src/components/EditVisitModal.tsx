import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

export type EditVisitContext = {
  id: string;
  client: string;
  date: string; // ISO or display string
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

  useEffect(() => {
    if (visit) {
      setStatus(visit.status || 'planned');
      setOutcome('pending');
      setPipeline('');
      setNotes('');
      setRDate('');
      setRTime('');
    }
  }, [visit?.id, visible]);

  if (!visit) return null;

  const showReschedule = status === 'rescheduled';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[s.backdrop, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
        <View style={[s.sheet, { backgroundColor: theme.surface }]}>
          {/* Handle */}
          <View style={s.handleWrap}>
            <View style={[s.handle, { backgroundColor: theme.border }]} />
          </View>

          {/* Header */}
          <View style={[s.header, { borderBottomColor: theme.divider }]}>
            <Text style={[s.title, { color: theme.text }]}>Edit Visit</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={[s.close, { color: theme.textSecondary }]}>✕</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
            {/* Context */}
            <Text style={[s.client, { color: theme.text }]}>{visit.client}</Text>
            <Text style={[s.context, { color: theme.textSecondary }]}>
              {visit.date} · {visit.time}
            </Text>

            {/* Status */}
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
                        backgroundColor: active ? theme.primary : theme.surfaceAlt,
                        borderColor: active ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: active ? '#fff' : theme.textSecondary }}>
                      {opt.emoji} {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Outcome */}
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
                        backgroundColor: active ? theme.primary : theme.surfaceAlt,
                        borderColor: active ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: active ? '#fff' : theme.textSecondary }}>
                      {opt.emoji} {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Pipeline */}
            <Label theme={theme}>Pipeline value (USD)</Label>
            <TextInput
              value={pipeline}
              onChangeText={setPipeline}
              placeholder="e.g. 24000"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
              style={[s.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
            />

            {/* Notes */}
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

            {/* Reschedule (conditional) */}
            {showReschedule && (
              <>
                <Label theme={theme}>Reschedule to</Label>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    value={rDate}
                    onChangeText={setRDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.textSecondary}
                    style={[s.input, { flex: 1, backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                  />
                  <TextInput
                    value={rTime}
                    onChangeText={setRTime}
                    placeholder="HH:MM"
                    placeholderTextColor={theme.textSecondary}
                    style={[s.input, { width: 110, backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                  />
                </View>
              </>
            )}

            {/* Actions */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
              <Pressable
                onPress={onClose}
                style={[s.btn, { borderColor: theme.border, backgroundColor: theme.surfaceAlt, flex: 1 }]}
              >
                <Text style={{ color: theme.text, fontWeight: '700' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  onSave({
                    id: visit.id,
                    status,
                    outcome,
                    pipelineUsd: pipeline,
                    notes,
                    rescheduleDate: rDate,
                    rescheduleTime: rTime,
                  })
                }
                style={[s.btn, { backgroundColor: theme.primary, borderColor: theme.primary, flex: 2 }]}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Save changes</Text>
              </Pressable>
            </View>
            {onDelete && (
              <Pressable
                onPress={() => onDelete(visit.id)}
                style={[s.btn, { marginTop: 10, borderColor: theme.error, backgroundColor: 'transparent' }]}
              >
                <Text style={{ color: theme.error, fontWeight: '700' }}>Delete visit</Text>
              </Pressable>
            )}
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
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '92%' },
  handleWrap: { alignItems: 'center', paddingTop: 8 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 16, fontWeight: '700' },
  close: { fontSize: 18 },
  client: { fontSize: 16, fontWeight: '700' },
  context: { fontSize: 12, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  btn: {
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
