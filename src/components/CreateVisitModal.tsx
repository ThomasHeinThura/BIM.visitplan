import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { getClients, upsertVisit } from '../lib/cockpit';
import type { CockpitClient, CockpitUser } from '../types';

type Props = {
  visible: boolean;
  user: CockpitUser;
  onClose: () => void;
  onSaved: () => void;
  /** Pre-fill a client when opening from a client workspace */
  preselectedClient?: Pick<CockpitClient, '_id' | 'name'> | null;
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function CreateVisitModal({
  visible,
  user,
  onClose,
  onSaved,
  preselectedClient,
}: Props) {
  const { theme } = useTheme();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayStr());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [agenda, setAgenda] = useState('');
  const [saving, setSaving] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  // Client picker state
  const [clientSearch, setClientSearch] = useState('');
  const [clients, setClients] = useState<CockpitClient[]>([]);
  const [selectedClient, setSelectedClient] = useState<Pick<CockpitClient, '_id' | 'name'> | null>(
    preselectedClient ?? null,
  );
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [clientsLoading, setClientsLoading] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setTitle('');
      setDate(todayStr());
      setStartTime('09:00');
      setEndTime('10:00');
      setLocation('');
      setAgenda('');
      setClientSearch('');
      setSelectedClient(preselectedClient ?? null);
      setShowClientPicker(false);
      setSaving(false);
      setClientError(null);
    }
  }, [visible, preselectedClient]);

  const loadClients = useCallback(async () => {
    setClientsLoading(true);
    try {
      const data = await getClients({ limit: 300, sort: { name: 1 } });
      setClients(data);
    } catch {
      // silent — user can retry
    } finally {
      setClientsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible && clients.length === 0) {
      loadClients();
    }
  }, [visible, clients.length, loadClients]);

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()),
  );

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a visit title.');
      return;
    }
    if (!selectedClient) {
      setClientError('Please select a client before saving.');
      return;
    }
    if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert('Invalid date', 'Use format YYYY-MM-DD.');
      return;
    }
    setSaving(true);
    try {
      await upsertVisit({
        title: title.trim(),
        date,
        start_time: startTime || undefined,
        end_time: endTime || undefined,
        location: location.trim() || undefined,
        agenda: agenda.trim() || undefined,
        status: 'scheduled',
        client: selectedClient
          ? { _id: selectedClient._id, name: selectedClient.name }
          : undefined,
        assigned_am: { _id: user._id, name: user.name },
      });
      onSaved();
      onClose();
    } catch {
      Alert.alert('Error', 'Could not save visit. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const s = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '92%',
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.border,
      alignSelf: 'center',
      marginTop: 10,
      marginBottom: 4,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
    },
    cancelText: { fontSize: 15, color: theme.textSecondary },
    saveBtn: {
      backgroundColor: theme.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      minWidth: 64,
      alignItems: 'center',
    },
    saveBtnDisabled: { opacity: 0.5 },
    saveBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
    form: { paddingHorizontal: 16, paddingBottom: 32 },
    label: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textSecondary,
      marginTop: 16,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    input: {
      backgroundColor: theme.inputBg,
      borderWidth: 1,
      borderColor: theme.inputBorder,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: theme.text,
    },
    textArea: { minHeight: 80, textAlignVertical: 'top' },
    row: { flexDirection: 'row', gap: 10 },
    halfInput: { flex: 1 },
    clientPicker: {
      backgroundColor: theme.inputBg,
      borderWidth: 1,
      borderColor: theme.inputBorder,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 11,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    clientPickerText: { fontSize: 15, color: theme.text },
    clientPickerPlaceholder: { fontSize: 15, color: theme.textSecondary },
    chevron: { fontSize: 14, color: theme.textSecondary },
    // Client picker modal
    pickerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      padding: 20,
    },
    pickerCard: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      maxHeight: '75%',
    },
    pickerHeader: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    pickerTitle: { fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 10 },
    searchInput: {
      backgroundColor: theme.inputBg,
      borderWidth: 1,
      borderColor: theme.inputBorder,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontSize: 14,
      color: theme.text,
    },
    clientRow: {
      paddingHorizontal: 16,
      paddingVertical: 13,
      borderBottomWidth: 1,
      borderBottomColor: theme.divider,
    },
    clientRowSelected: { backgroundColor: theme.surfaceAlt },
    clientRowName: { fontSize: 14, fontWeight: '500', color: theme.text },
    clientRowSector: { fontSize: 12, color: theme.textSecondary, marginTop: 1 },
    clearBtn: {
      padding: 14,
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    clearBtnText: { fontSize: 14, color: theme.error, fontWeight: '600' },
    closePickerBtn: {
      padding: 14,
      alignItems: 'center',
    },
    closePickerText: { fontSize: 14, color: theme.textSecondary },
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.sheet}>
          <View style={s.handle} />
          <View style={s.headerRow}>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={s.cancelText}>Cancel</Text>
            </Pressable>
            <Text style={s.headerTitle}>New Visit</Text>
            <Pressable
              style={[s.saveBtn, saving && s.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <Text style={s.saveBtnText}>Save</Text>
              }
            </Pressable>
          </View>

          <ScrollView style={s.form} keyboardShouldPersistTaps="handled">
            <Text style={s.label}>Title *</Text>
            <TextInput
              style={s.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Visit purpose or meeting name"
              placeholderTextColor={theme.textSecondary}
              returnKeyType="next"
            />

            <Text style={s.label}>Client *</Text>
            <TouchableOpacity
              style={[s.clientPicker, clientError ? { borderColor: theme.error } : null]}
              onPress={() => setShowClientPicker(true)}
              activeOpacity={0.75}
            >
              {selectedClient
                ? <Text style={s.clientPickerText}>{selectedClient.name}</Text>
                : <Text style={s.clientPickerPlaceholder}>Select client…</Text>
              }
              <Text style={s.chevron}>▾</Text>
            </TouchableOpacity>
            {clientError && (
              <Text style={{ color: theme.error, fontSize: 12, marginTop: 4 }}>{clientError}</Text>
            )}

            <Text style={s.label}>Date</Text>
            <TextInput
              style={s.input}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numbers-and-punctuation"
            />

            <Text style={s.label}>Time</Text>
            <View style={s.row}>
              <View style={s.halfInput}>
                <TextInput
                  style={s.input}
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="09:00"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              <View style={s.halfInput}>
                <TextInput
                  style={s.input}
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="10:00"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>

            <Text style={s.label}>Location</Text>
            <TextInput
              style={s.input}
              value={location}
              onChangeText={setLocation}
              placeholder="Address or place name"
              placeholderTextColor={theme.textSecondary}
            />

            <Text style={s.label}>Agenda</Text>
            <TextInput
              style={[s.input, s.textArea]}
              value={agenda}
              onChangeText={setAgenda}
              placeholder="Pre-visit notes or objectives…"
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={4}
            />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* Client picker modal */}
      <Modal
        visible={showClientPicker}
        animationType="fade"
        transparent
        onRequestClose={() => setShowClientPicker(false)}
      >
        <View style={s.pickerOverlay}>
          <View style={s.pickerCard}>
            <View style={s.pickerHeader}>
              <Text style={s.pickerTitle}>Select Client</Text>
              <TextInput
                style={s.searchInput}
                value={clientSearch}
                onChangeText={setClientSearch}
                placeholder="Search clients…"
                placeholderTextColor={theme.textSecondary}
                autoFocus
              />
            </View>
            {clientsLoading
              ? <ActivityIndicator color={theme.primary} style={{ margin: 20 }} />
              : (
                <FlatList
                  data={filteredClients}
                  keyExtractor={(c) => c._id}
                  renderItem={({ item: c }) => (
                    <TouchableOpacity
                      style={[
                        s.clientRow,
                        selectedClient?._id === c._id && s.clientRowSelected,
                      ]}
                      onPress={() => {
                        setSelectedClient({ _id: c._id, name: c.name });
                        setClientError(null);
                        setShowClientPicker(false);
                        setClientSearch('');
                      }}
                    >
                      <Text style={s.clientRowName}>{c.name}</Text>
                      {c.sector && (
                        <Text style={s.clientRowSector}>{c.sector} · {c.status}</Text>
                      )}
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <Text style={{ padding: 20, color: theme.textSecondary, textAlign: 'center' }}>
                      No clients found.
                    </Text>
                  }
                />
              )
            }
            {selectedClient && (
              <TouchableOpacity
                style={s.clearBtn}
                onPress={() => {
                  setSelectedClient(null);
                  setShowClientPicker(false);
                }}
              >
                <Text style={s.clearBtnText}>Clear Selection</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={s.closePickerBtn}
              onPress={() => setShowClientPicker(false)}
            >
              <Text style={s.closePickerText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}
