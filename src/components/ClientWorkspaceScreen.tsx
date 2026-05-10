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
import { useTheme, fonts, radii } from '../context/ThemeContext';
import {
  getContactsByClient,
  getSectors,
  getVisits,
  upsertClient,
  upsertContact,
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
import { Badge, Card, Icon, PrimaryButton, SecondaryButton } from './ui';

type Tab = 'info' | 'visits' | 'contacts';

type Props = {
  client: CockpitClient | null;
  user: CockpitUser;
  visible: boolean;
  onClose: () => void;
  onOpenVisit?: (visit: CockpitVisit) => void;
  onAddVisit?: (client: CockpitClient) => void;
  onClientUpdated?: (client: CockpitClient) => void;
};

type InlineNotice = {
  tone: 'success' | 'error';
  message: string;
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
  onClientUpdated,
}: Props) {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('info');

  // Editable fields
  const [editStatus, setEditStatus] = useState<ClientStatus>('Active');
  const [editAccountType, setEditAccountType] = useState<AccountType>('Named Account');
  const [editSector, setEditSector] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoNotice, setInfoNotice] = useState<InlineNotice | null>(null);

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
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactNotice, setContactNotice] = useState<InlineNotice | null>(null);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPosition, setNewContactPosition] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [savingContact, setSavingContact] = useState(false);

  // Picker modals
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showSectorPicker, setShowSectorPicker] = useState(false);
  const [sectors, setSectors] = useState<string[]>([]);

  useEffect(() => {
    if (client) {
      setEditStatus(client.status);
      setEditAccountType(client.account_type ?? 'Named Account');
      setEditSector(client.sector ?? '');
      setEditNotes(client.notes ?? '');
      setEditName(client.name);
      setEditAddress(client.address ?? '');
      setEditPhone(client.phone ?? '');
      setEditWebsite(client.website ?? '');
      setActiveTab('info');
      setInfoNotice(null);
      setContactNotice(null);
      setShowContactModal(false);
    }
  }, [client?._id]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await getSectors();
        if (!cancelled) {
          setSectors(data);
        }
      } catch {
        if (!cancelled) {
          setSectors([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

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
    setInfoNotice(null);
    try {
      const patch: Partial<CockpitClient> & { _id: string } = {
        _id: client._id,
        status: editStatus,
        account_type: editAccountType,
        sector: editSector.trim() || undefined,
        notes: editNotes.trim() || undefined,
      };
      if (user.role === 'admin') {
        patch.name = editName.trim() || client.name;
        patch.address = editAddress.trim() || undefined;
        patch.phone = editPhone.trim() || undefined;
        patch.website = editWebsite.trim() || undefined;
      }
      const savedClient = await upsertClient(patch);
      const mergedClient: CockpitClient = {
        ...client,
        ...patch,
        ...savedClient,
      };
      onClientUpdated?.(mergedClient);
      setInfoNotice({ tone: 'success', message: 'Client saved successfully.' });
    } catch {
      setInfoNotice({ tone: 'error', message: 'Client could not be saved. Please try again.' });
    } finally {
      setSavingInfo(false);
    }
  };

  const resetContactForm = () => {
    setNewContactName('');
    setNewContactPosition('');
    setNewContactEmail('');
    setNewContactPhone('');
  };

  const handleOpenContactModal = () => {
    resetContactForm();
    setContactNotice(null);
    setShowContactModal(true);
  };

  const handleSaveContact = async () => {
    if (!client) return;

    const trimmedName = newContactName.trim();
    if (!trimmedName) {
      setContactNotice({ tone: 'error', message: 'Contact name is required.' });
      return;
    }

    setSavingContact(true);
    setContactNotice(null);
    try {
      await upsertContact({
        name: trimmedName,
        client: { _id: client._id, name: client.name },
        position: newContactPosition.trim() || undefined,
        email: newContactEmail.trim() || undefined,
        phone: newContactPhone.trim() || undefined,
      });
      await loadContacts();
      setContactNotice({ tone: 'success', message: 'Contact saved successfully.' });
      resetContactForm();
      setShowContactModal(false);
    } catch {
      setContactNotice({ tone: 'error', message: 'Contact could not be saved. Please try again.' });
    } finally {
      setSavingContact(false);
    }
  };

  if (!client) return null;

  const isAdmin = user.role === 'admin';

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
      height: '94%',
      paddingBottom: 18,
    },
    handle: {
      width: 36, height: 4, borderRadius: radii.full,
      backgroundColor: theme.border,
      alignSelf: 'center',
      marginTop: 10, marginBottom: 2,
    },
    headerRow: {
      paddingHorizontal: 16, paddingVertical: 12,
      backgroundColor: 'transparent',
    },
    closeRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4 },
    closeBtnText: { fontSize: 18, color: theme.textSecondary, lineHeight: 18 },
    clientName: { fontSize: 17, fontWeight: '700', color: theme.text, fontFamily: fonts.display },
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
      borderBottomWidth: 1, borderBottomColor: theme.divider,
      paddingHorizontal: 16,
      backgroundColor: 'transparent',
    },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
    tabActive: { borderBottomWidth: 2, borderBottomColor: theme.primary },
    tabText: { fontSize: 11, fontWeight: '600', color: theme.textFaint, fontFamily: fonts.display },
    tabTextActive: { color: theme.primary, fontWeight: '700' },
    body: { flex: 1 },
    infoForm: { padding: 16 },
    label: {
      fontSize: 12, fontWeight: '600', color: theme.textSecondary,
      textTransform: 'uppercase', letterSpacing: 0.4,
      marginTop: 14, marginBottom: 5,
    },
    textInput: {
      backgroundColor: theme.inputBg,
      borderWidth: 1.5, borderColor: theme.inputBorder,
      borderRadius: radii.md, paddingHorizontal: 12, paddingVertical: 10,
      fontSize: 14, color: theme.text,
    },
    textArea: { minHeight: 80, textAlignVertical: 'top' },
    notice: {
      borderRadius: radii.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginTop: 14,
    },
    noticeSuccess: {
      backgroundColor: `${theme.success}1A`,
      borderWidth: 1,
      borderColor: `${theme.success}55`,
    },
    noticeError: {
      backgroundColor: `${theme.error}14`,
      borderWidth: 1,
      borderColor: `${theme.error}44`,
    },
    noticeText: {
      fontSize: 13,
      fontWeight: '600',
    },
    pickerBtn: {
      backgroundColor: theme.inputBg,
      borderWidth: 1.5, borderColor: theme.inputBorder,
      borderRadius: radii.md, paddingHorizontal: 12, paddingVertical: 11,
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    pickerBtnText: { fontSize: 14, color: theme.text },
    chevron: { fontSize: 14, color: theme.textSecondary },
    visitCard: {
      marginHorizontal: 12, marginTop: 8,
      backgroundColor: theme.surface,
      borderRadius: radii.md, padding: 14,
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
    contactsSection: { flex: 1 },
    contactsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingTop: 12,
      gap: 12,
    },
    contactsHeaderText: {
      fontSize: 12,
      color: theme.textSecondary,
      flex: 1,
    },
    addContactBtn: {
      backgroundColor: theme.primary,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: radii.full,
    },
    addContactBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
    contactName: { fontSize: 14, fontWeight: '600', color: theme.text },
    contactMeta: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },
    empty: { padding: 40, alignItems: 'center' },
    emptyText: { fontSize: 14, color: theme.textSecondary, textAlign: 'center' },
    addVisitFab: {
      position: 'absolute', right: 16, bottom: 20,
      backgroundColor: theme.primary,
      paddingHorizontal: 16, paddingVertical: 11,
      borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 6,
      elevation: 5,
      shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25, shadowRadius: 8,
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
    contactModalCard: {
      backgroundColor: theme.surface,
      borderRadius: 18,
      padding: 18,
      gap: 10,
    },
    contactModalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
      fontFamily: fonts.display,
    },
    modalActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 8,
    },
    modalAction: { flex: 1 },
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.handle} />

          <View style={s.headerRow}>
            <View style={s.closeRow}>
              <Pressable onPress={onClose} hitSlop={10} style={{ width: 28, height: 28, borderRadius: radii.full, backgroundColor: theme.surfaceOffset, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={s.closeBtnText}>×</Text>
              </Pressable>
            </View>
            <Text style={s.clientName}>{client.name}</Text>
            <View style={s.metaRow}>
              {client.sector ? <Text style={s.sectorText}>{client.sector} ·</Text> : null}
              <Badge tone="teal">{client.status}</Badge>
              {client.account_type ? (
                <Text style={s.sectorText}>{client.account_type}</Text>
              ) : null}
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 6 }}>
            <Card style={{ flex: 1, paddingVertical: 10, alignItems: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text, fontFamily: fonts.display }}>{visits.length || '—'}</Text>
              <Text style={{ fontSize: 10, color: theme.textSecondary }}>Total Visits</Text>
            </Card>
            <Card style={{ flex: 1, paddingVertical: 10, alignItems: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: theme.success, fontFamily: fonts.display }}>
                {visits.length ? `${Math.round((visits.filter((v) => v.status === 'completed').length / visits.length) * 100)}%` : '—'}
              </Text>
              <Text style={{ fontSize: 10, color: theme.textSecondary }}>Success Rate</Text>
            </Card>
            <Card style={{ flex: 1, paddingVertical: 10, alignItems: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text, fontFamily: fonts.display }}>{contacts.length || '—'}</Text>
              <Text style={{ fontSize: 10, color: theme.textSecondary }}>Contacts</Text>
            </Card>
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

                <Text style={s.label}>Sector</Text>
                <TouchableOpacity style={s.pickerBtn} onPress={() => setShowSectorPicker(true)}>
                  <Text style={s.pickerBtnText}>{editSector || 'Select sector'}</Text>
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

                {infoNotice ? (
                  <View style={[s.notice, infoNotice.tone === 'success' ? s.noticeSuccess : s.noticeError]}>
                    <Text style={[s.noticeText, { color: infoNotice.tone === 'success' ? theme.success : theme.error }]}>
                      {infoNotice.message}
                    </Text>
                  </View>
                ) : null}

                <Pressable
                  onPress={handleSaveInfo}
                  disabled={savingInfo}
                >
                  <PrimaryButton
                    label={savingInfo ? 'Saving…' : 'Save Changes'}
                    onPress={handleSaveInfo}
                    disabled={savingInfo}
                    icon={savingInfo ? <ActivityIndicator size="small" color="#FFFFFF" /> : undefined}
                  />
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
              <View style={s.contactsSection}>
                <View style={s.contactsHeader}>
                  <Text style={s.contactsHeaderText}>Add and manage contacts for this account.</Text>
                  <TouchableOpacity style={s.addContactBtn} onPress={handleOpenContactModal} activeOpacity={0.85}>
                    <Text style={s.addContactBtnText}>+ Add Contact</Text>
                  </TouchableOpacity>
                </View>

                {contactNotice ? (
                  <View style={[s.notice, contactNotice.tone === 'success' ? s.noticeSuccess : s.noticeError, { marginHorizontal: 12, marginBottom: 4 }]}>
                    <Text style={[s.noticeText, { color: contactNotice.tone === 'success' ? theme.success : theme.error }]}>
                      {contactNotice.message}
                    </Text>
                  </View>
                ) : null}

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
              </View>
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

      <Modal
        visible={showSectorPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSectorPicker(false)}
      >
        <View style={s.pickerOverlay}>
          <View style={s.pickerCard}>
            {sectors.map((sector) => (
              <TouchableOpacity
                key={sector}
                style={[s.pickerItem, editSector === sector && s.pickerItemSelected]}
                onPress={() => { setEditSector(sector); setShowSectorPicker(false); }}
              >
                <Text style={[s.pickerItemText, editSector === sector && s.pickerItemTextSelected]}>
                  {sector}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.pickerCancel} onPress={() => setShowSectorPicker(false)}>
              <Text style={s.pickerCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showContactModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowContactModal(false)}
      >
        <View style={s.pickerOverlay}>
          <View style={s.contactModalCard}>
            <Text style={s.contactModalTitle}>Add Contact</Text>

            <Text style={s.label}>Contact Name</Text>
            <TextInput
              style={s.textInput}
              value={newContactName}
              onChangeText={setNewContactName}
              placeholder="Contact name"
              placeholderTextColor={theme.textSecondary}
            />

            <Text style={s.label}>Position</Text>
            <TextInput
              style={s.textInput}
              value={newContactPosition}
              onChangeText={setNewContactPosition}
              placeholder="Decision maker, finance lead, etc."
              placeholderTextColor={theme.textSecondary}
            />

            <Text style={s.label}>Phone</Text>
            <TextInput
              style={s.textInput}
              value={newContactPhone}
              onChangeText={setNewContactPhone}
              placeholder="+95 9 xxx xxx xxx"
              placeholderTextColor={theme.textSecondary}
              keyboardType="phone-pad"
            />

            <Text style={s.label}>Email</Text>
            <TextInput
              style={s.textInput}
              value={newContactEmail}
              onChangeText={setNewContactEmail}
              placeholder="name@company.com"
              placeholderTextColor={theme.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            {contactNotice?.tone === 'error' ? (
              <View style={[s.notice, s.noticeError, { marginTop: 6 }]}> 
                <Text style={[s.noticeText, { color: theme.error }]}>{contactNotice.message}</Text>
              </View>
            ) : null}

            <View style={s.modalActions}>
              <View style={s.modalAction}>
                <SecondaryButton
                  label="Cancel"
                  onPress={() => {
                    if (!savingContact) setShowContactModal(false);
                  }}
                />
              </View>
              <View style={s.modalAction}>
                <PrimaryButton
                  label={savingContact ? 'Saving…' : 'Save Contact'}
                  onPress={handleSaveContact}
                  disabled={savingContact}
                  icon={savingContact ? <ActivityIndicator size="small" color="#FFFFFF" /> : undefined}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}
