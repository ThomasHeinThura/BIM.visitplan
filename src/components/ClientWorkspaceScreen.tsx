import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import {
  getContactsByClient,
  getVisits,
  upsertClient,
} from '../lib/cockpit';
import type {
  AccountType,
  ClientStatus,
  CockpitClient,
  CockpitContact,
  CockpitUser,
  CockpitVisit,
} from '../types';
import { ACCOUNT_TYPES as ACCT_TYPES, CLIENT_STATUSES as STATUSES } from '../types';

type Tab = 'info' | 'visits' | 'contacts';

type Props = {
  client: CockpitClient | null;
  user: CockpitUser;
  visible: boolean;
  onClose: () => void;
  onOpenVisit?: (visit: CockpitVisit) => void;
  onAddVisit?: (client: CockpitClient) => void;
};

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString(undefined, {
    month: 'short', day: 'numeric',
  });
}

function visitStatusColor(status: CockpitVisit['status'], theme: ReturnType<typeof useTheme>['theme']) {
  switch (status) {
    case 'scheduled': return theme.info;
    case 'in_progress': return theme.warning;
    case 'completed': return theme.success;
    case 'missed': return theme.error;
  }
}

export default function ClientWorkspaceScreen({
  client,
  user,
  visible,
  onClose,
  onOpenVisit,
  onAddVisit,
}: Props) {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('info');

  // Editable fields
  const [editStatus, setEditStatus] = useState<ClientStatus>('Active');
  const [editAccountType, setEditAccountType] = useState<AccountType>('Named Account');
  const [editNotes, setEditNotes] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);

  // Admin-only editable
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editWebsite, setEditWebsite] = useState('');

  // Visits
  const [visits, setVisits] = useState<CockpitVisit[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(false);

  // Contacts
  const [contacts, setContacts] = useState<CockpitContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);

  // Picker modals
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);

  useEffect(() => {
    if (client) {
      setEditStatus(client.status);
      setEditAccountType(client.account_type ?? 'Named Account');
      setEditNotes(client.notes ?? '');
      setEditName(client.name);
      setEditAddress(client.address ?? '');
      setEditPhone(client.phone ?? '');
      setEditWebsite(client.website ?? '');
      setActiveTab('info');
    }
  }, [client?._id]);

  const loadVisits = useCallback(async () => {
    if (!client) return;
    setVisitsLoading(true);
    try {
      const data = await getVisits({
        filter: { 'client._id': client._id },
        limit: 30,
        sort: { date: -1 },
      });
      setVisits(data);
    } catch {
      setVisits([]);
    } finally {
      setVisitsLoading(false);
    }
  }, [client?._id]);

  const loadContacts = useCallback(async () => {
    if (!client) return;
    setContactsLoading(true);
    try {
      const data = await getContactsByClient(client._id);
      setContacts(data);
    } catch {
      setContacts([]);
    } finally {
      setContactsLoading(false);
    }
  }, [client?._id]);

  useEffect(() => {
    if (activeTab === 'visits') void loadVisits();
    if (activeTab === 'contacts') void loadContacts();
  }, [activeTab, loadVisits, loadContacts]);

  const handleSaveInfo = async () => {
    if (!client) return;
    setSavingInfo(true);
    try {
      const patch: Partial<CockpitClient> & { _id: string } = {
        _id: client._id,
        status: editStatus,
        account_type: editAccountType,
        notes: editNotes.trim() || undefined,
      };
      if (user.role === 'admin') {
        patch.name = editName.trim() || client.name;
        patch.address = editAddress.trim() || undefined;
        patch.phone = editPhone.trim() || undefined;
        patch.website = editWebsite.trim() || undefined;
      }
      await upsertClient(patch);
      Alert.alert('Saved', 'Client updated successfully.');
    } catch {
      Alert.alert('Error', 'Could not save changes.');
    } finally {
      setSavingInfo(false);
    }
  };

  if (!client) return null;

  const isAdmin = user.role === 'admin';

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
      height: '94%',
    },
    handle: {
      width: 40, height: 4, borderRadius: 2,
      backgroundColor: theme.border,
      alignSelf: 'center',
      marginTop: 10, marginBottom: 2,
    },
    headerRow: {
      paddingHorizontal: 16, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: theme.border,
    },
    closeRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4 },
    closeBtnText: { fontSize: 20, color: theme.textSecondary },
    clientName: { fontSize: 18, fontWeight: '700', color: theme.text },
    metaRow: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      marginTop: 4, flexWrap: 'wrap',
    },
    sectorText: { fontSize: 13, color: theme.textSecondary },
    statusBadge: {
      paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12,
      backgroundColor: theme.info,
    },
    statusBadgeText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
    tabs: {
      flexDirection: 'row',
      borderBottomWidth: 1, borderBottomColor: theme.border,
      backgroundColor: theme.surface,
    },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
    tabActive: { borderBottomWidth: 2, borderBottomColor: theme.primary },
    tabText: { fontSize: 13, fontWeight: '500', color: theme.textSecondary },
    tabTextActive: { color: theme.primary, fontWeight: '700' },
    body: { flex: 1 },
    infoForm: { padding: 16 },
    label: {
      fontSize: 12, fontWeight: '600', color: theme.textSecondary,
      textTransform: 'uppercase', letterSpacing: 0.4,
      marginTop: 14, marginBottom: 5,
    },
    textInput: {
      backgroundColor: theme.surfaceAlt,
      borderWidth: 1, borderColor: theme.border,
      borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
      fontSize: 15, color: theme.text,
    },
    textArea: { minHeight: 80, textAlignVertical: 'top' },
    pickerBtn: {
      backgroundColor: theme.surfaceAlt,
      borderWidth: 1, borderColor: theme.border,
      borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11,
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    pickerBtnText: { fontSize: 15, color: theme.text },
    chevron: { fontSize: 14, color: theme.textSecondary },
    saveBtn: {
      backgroundColor: theme.primary,
      borderRadius: 12, paddingVertical: 14,
      alignItems: 'center', marginTop: 20, marginBottom: 10,
    },
    saveBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
    visitCard: {
      marginHorizontal: 12, marginTop: 8,
      backgroundColor: theme.surface,
      borderRadius: 12, padding: 14,
      borderWidth: 1, borderColor: theme.border,
    },
    visitRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    visitTitle: {
      fontSize: 14, fontWeight: '600', color: theme.text, flex: 1, marginRight: 8,
    },
    visitBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
    visitBadgeText: { fontSize: 11, fontWeight: '600', color: '#FFFFFF' },
    visitDate: { fontSize: 12, color: theme.textSecondary, marginTop: 3 },
    contactCard: {
      marginHorizontal: 12, marginTop: 8,
      backgroundColor: theme.surface,
      borderRadius: 12, padding: 14,
      borderWidth: 1, borderColor: theme.border,
    },
    contactName: { fontSize: 14, fontWeight: '600', color: theme.text },
    contactMeta: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },
    empty: { padding: 40, alignItems: 'center' },
    emptyText: { fontSize: 14, color: theme.textSecondary, textAlign: 'center' },
    addVisitFab: {
      position: 'absolute', right: 16, bottom: 20,
      backgroundColor: theme.accent,
      paddingHorizontal: 18, paddingVertical: 12,
      borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 6,
      elevation: 5,
      shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2, shadowRadius: 6,
    },
    addVisitFabText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
    pickerOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center', padding: 20,
    },
    pickerCard: {
      backgroundColor: theme.surface, borderRadius: 16, overflow: 'hidden',
    },
    pickerItem: {
      paddingHorizontal: 20, paddingVertical: 15,
      borderBottomWidth: 1, borderBottomColor: theme.border,
    },
    pickerItemSelected: { backgroundColor: theme.surfaceAlt },
    pickerItemText: { fontSize: 15, color: theme.text },
    pickerItemTextSelected: { color: theme.primary, fontWeight: '700' },
    pickerCancel: { padding: 15, alignItems: 'center' },
    pickerCancelText: { fontSize: 15, color: theme.textSecondary },
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.handle} />

          <View style={s.headerRow}>
            <View style={s.closeRow}>
              <Pressable onPress={onClose} hitSlop={10}>
                <Text style={s.closeBtnText}>✕</Text>
              </Pressable>
            </View>
            <Text style={s.clientName}>{client.name}</Text>
            <View style={s.metaRow}>
              {client.sector ? <Text style={s.sectorText}>{client.sector} ·</Text> : null}
              <View style={s.statusBadge}>
                <Text style={s.statusBadgeText}>{client.status}</Text>
              </View>
              {client.account_type ? (
                <Text style={s.sectorText}>{client.account_type}</Text>
              ) : null}
            </View>
          </View>

          <View style={s.tabs}>
            {(['info', 'visits', 'contacts'] as Tab[]).map((tab) => (
              <Pressable
                key={tab}
                style={[s.tab, activeTab === tab && s.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={s.body}>
            {activeTab === 'info' && (
              <ScrollView style={s.infoForm} keyboardShouldPersistTaps="handled">
                {isAdmin ? (
                  <>
                    <Text style={s.label}>Client Name</Text>
                    <TextInput
                      style={s.textInput}
                      value={editName}
                      onChangeText={setEditName}
                      placeholder="Client name"
                      placeholderTextColor={theme.textSecondary}
                    />
                  </>
                ) : null}

                <Text style={s.label}>Status</Text>
                <TouchableOpacity style={s.pickerBtn} onPress={() => setShowStatusPicker(true)}>
                  <Text style={s.pickerBtnText}>{editStatus}</Text>
                  <Text style={s.chevron}>▾</Text>
                </TouchableOpacity>

                <Text style={s.label}>Account Type</Text>
                <TouchableOpacity style={s.pickerBtn} onPress={() => setShowTypePicker(true)}>
                  <Text style={s.pickerBtnText}>{editAccountType}</Text>
                  <Text style={s.chevron}>▾</Text>
                </TouchableOpacity>

                {isAdmin ? (
                  <>
                    <Text style={s.label}>Address</Text>
                    <TextInput
                      style={s.textInput}
                      value={editAddress}
                      onChangeText={setEditAddress}
                      placeholder="Physical address"
                      placeholderTextColor={theme.textSecondary}
                    />
                    <Text style={s.label}>Phone</Text>
                    <TextInput
                      style={s.textInput}
                      value={editPhone}
                      onChangeText={setEditPhone}
                      placeholder="+95 9 xxx xxx xxx"
                      placeholderTextColor={theme.textSecondary}
                      keyboardType="phone-pad"
                    />
                    <Text style={s.label}>Website</Text>
                    <TextInput
                      style={s.textInput}
                      value={editWebsite}
                      onChangeText={setEditWebsite}
                      placeholder="https://"
                      placeholderTextColor={theme.textSecondary}
                      keyboardType="url"
                      autoCapitalize="none"
                    />
                  </>
                ) : null}

                <Text style={s.label}>Notes</Text>
                <TextInput
                  style={[s.textInput, s.textArea]}
                  value={editNotes}
                  onChangeText={setEditNotes}
                  placeholder="Internal notes about this client"
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={4}
                />

                <Pressable
                  style={[s.saveBtn, savingInfo && { opacity: 0.6 }]}
                  onPress={handleSaveInfo}
                  disabled={savingInfo}
                >
                  {savingInfo
                    ? <ActivityIndicator size="small" color="#FFFFFF" />
                    : <Text style={s.saveBtnText}>Save Changes</Text>
                  }
                </Pressable>
                <View style={{ height: 20 }} />
              </ScrollView>
            )}

            {activeTab === 'visits' && (
              <View style={{ flex: 1 }}>
                {visitsLoading ? (
                  <ActivityIndicator color={theme.primary} style={{ margin: 30 }} />
                ) : (
                  <FlatList
                    data={visits}
                    keyExtractor={(v) => v._id}
                    renderItem={({ item: v }) => (
                      <TouchableOpacity
                        style={s.visitCard}
                        onPress={() => onOpenVisit?.(v)}
                        activeOpacity={0.75}
                      >
                        <View style={s.visitRow}>
                          <Text style={s.visitTitle} numberOfLines={1}>{v.title}</Text>
                          <View style={[s.visitBadge, { backgroundColor: visitStatusColor(v.status, theme) }]}>
                            <Text style={s.visitBadgeText}>{v.status.replace('_', ' ')}</Text>
                          </View>
                        </View>
                        <Text style={s.visitDate}>
                          {fmtDate(v.date)}{v.start_time ? ` · ${v.start_time}` : ''}
                        </Text>
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                      <View style={s.empty}>
                        <Text style={s.emptyText}>No visits for this client yet.</Text>
                      </View>
                    }
                    contentContainerStyle={{ paddingBottom: 100 }}
                  />
                )}
                {onAddVisit ? (
                  <Pressable style={s.addVisitFab} onPress={() => onAddVisit(client)}>
                    <Text style={s.addVisitFabText}>+ Schedule Visit</Text>
                  </Pressable>
                ) : null}
              </View>
            )}

            {activeTab === 'contacts' && (
              <>
                {contactsLoading ? (
                  <ActivityIndicator color={theme.primary} style={{ margin: 30 }} />
                ) : (
                  <FlatList
                    data={contacts}
                    keyExtractor={(c) => c._id}
                    renderItem={({ item: c }) => (
                      <View style={s.contactCard}>
                        <Text style={s.contactName}>{c.name}</Text>
                        {c.position ? <Text style={s.contactMeta}>{c.position}</Text> : null}
                        {c.email ? <Text style={s.contactMeta}>✉ {c.email}</Text> : null}
                        {c.phone ? <Text style={s.contactMeta}>📞 {c.phone}</Text> : null}
                      </View>
                    )}
                    ListEmptyComponent={
                      <View style={s.empty}>
                        <Text style={s.emptyText}>No contacts added yet.</Text>
                      </View>
                    }
                    contentContainerStyle={{ paddingBottom: 80 }}
                  />
                )}
              </>
            )}
          </View>
        </View>
      </View>

      <Modal
        visible={showStatusPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStatusPicker(false)}
      >
        <View style={s.pickerOverlay}>
          <View style={s.pickerCard}>
            {STATUSES.map((st) => (
              <TouchableOpacity
                key={st}
                style={[s.pickerItem, editStatus === st && s.pickerItemSelected]}
                onPress={() => { setEditStatus(st); setShowStatusPicker(false); }}
              >
                <Text style={[s.pickerItemText, editStatus === st && s.pickerItemTextSelected]}>
                  {st}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.pickerCancel} onPress={() => setShowStatusPicker(false)}>
              <Text style={s.pickerCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showTypePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTypePicker(false)}
      >
        <View style={s.pickerOverlay}>
          <View style={s.pickerCard}>
            {ACCT_TYPES.map((at) => (
              <TouchableOpacity
                key={at}
                style={[s.pickerItem, editAccountType === at && s.pickerItemSelected]}
                onPress={() => { setEditAccountType(at); setShowTypePicker(false); }}
              >
                <Text style={[s.pickerItemText, editAccountType === at && s.pickerItemTextSelected]}>
                  {at}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.pickerCancel} onPress={() => setShowTypePicker(false)}>
              <Text style={s.pickerCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}
