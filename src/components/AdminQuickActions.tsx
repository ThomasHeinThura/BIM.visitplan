import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  getFinancialYears,
  upsertClient,
  upsertFinancialQuarter,
  upsertFinancialYear,
} from '../lib/cockpit';
import { styles } from '../styles';
import { toFriendlyMessage } from '../utils/visitplan';

type AdminQuickActionsProps = {
  authRole: string | null;
  onSuccess: () => void;
  onBanner: (tone: 'success' | 'error' | 'info', message: string) => void;
};

type ClientForm = {
  name: string;
  sector: string;
  tier: '' | 'A' | 'B' | 'C';
  status: 'active' | 'inactive';
};

type QuarterForm = {
  yearName: string;
  yearNumber: string;
  quarterName: string;
  quarterNumber: '1' | '2' | '3' | '4';
};

const TIER_OPTIONS: Array<'' | 'A' | 'B' | 'C'> = ['', 'A', 'B', 'C'];
const QUARTER_OPTIONS: Array<'1' | '2' | '3' | '4'> = ['1', '2', '3', '4'];

const INITIAL_CLIENT_FORM: ClientForm = {
  name: '',
  sector: '',
  tier: '',
  status: 'active',
};

const INITIAL_QUARTER_FORM: QuarterForm = {
  yearName: '',
  yearNumber: String(new Date().getFullYear()),
  quarterName: '',
  quarterNumber: '1',
};

export function AdminQuickActions({ authRole, onSuccess, onBanner }: AdminQuickActionsProps) {
  const canManage =
    authRole === 'admin' || authRole === 'director' || authRole === 'sales_manager';

  const [clientModalVisible, setClientModalVisible] = useState(false);
  const [clientForm, setClientForm] = useState<ClientForm>(INITIAL_CLIENT_FORM);
  const [clientSubmitting, setClientSubmitting] = useState(false);

  const [quarterModalVisible, setQuarterModalVisible] = useState(false);
  const [quarterForm, setQuarterForm] = useState<QuarterForm>(INITIAL_QUARTER_FORM);
  const [quarterSubmitting, setQuarterSubmitting] = useState(false);

  if (!canManage) return null;

  async function handleCreateClient() {
    if (!clientForm.name.trim()) {
      onBanner('error', 'Client name is required.');
      return;
    }
    setClientSubmitting(true);
    try {
      await upsertClient({
        name: clientForm.name.trim(),
        sector: clientForm.sector.trim() || undefined,
        tier: clientForm.tier || undefined,
        status: clientForm.status,
      });
      setClientModalVisible(false);
      setClientForm(INITIAL_CLIENT_FORM);
      onBanner('success', `Client "${clientForm.name.trim()}" created.`);
      onSuccess();
    } catch (error) {
      onBanner('error', toFriendlyMessage(error));
    } finally {
      setClientSubmitting(false);
    }
  }

  async function handleCreateQuarter() {
    if (!quarterForm.yearName.trim() || !quarterForm.quarterName.trim()) {
      onBanner('error', 'Financial year name and quarter name are required.');
      return;
    }
    setQuarterSubmitting(true);
    try {
      const yearName = quarterForm.yearName.trim();
      const existing = await getFinancialYears({ filter: { name: yearName } });
      let year = existing[0] ?? null;
      if (!year) {
        year = await upsertFinancialYear({
          name: yearName,
          year: parseInt(quarterForm.yearNumber, 10) || new Date().getFullYear(),
          active: true,
        });
      }
      await upsertFinancialQuarter({
        name: quarterForm.quarterName.trim(),
        year: { _id: year._id, name: year.name },
        quarter_number: parseInt(quarterForm.quarterNumber, 10) as 1 | 2 | 3 | 4,
        active: true,
      });
      setQuarterModalVisible(false);
      setQuarterForm(INITIAL_QUARTER_FORM);
      onBanner('success', `Quarter "${quarterForm.quarterName.trim()}" created.`);
      onSuccess();
    } catch (error) {
      onBanner('error', toFriendlyMessage(error));
    } finally {
      setQuarterSubmitting(false);
    }
  }

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Admin Tools</Text>
      <View style={styles.inlineButtonRowCompact}>
        <Pressable onPress={() => setClientModalVisible(true)} style={styles.primaryButtonSmall}>
          <Text style={styles.primaryButtonText}>+ Client</Text>
        </Pressable>
        <Pressable onPress={() => setQuarterModalVisible(true)} style={styles.secondaryButtonMuted}>
          <Text style={styles.secondaryButtonText}>+ Quarter</Text>
        </Pressable>
      </View>

      {/* ─── Create Client Modal ─── */}
      <Modal
        visible={clientModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setClientModalVisible(false)}
      >
        <View style={adminStyles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={adminStyles.sheetWrap}
          >
            <View style={adminStyles.sheet}>
              <Text style={adminStyles.title}>New Client</Text>

              <Text style={adminStyles.label}>Name *</Text>
              <TextInput
                style={adminStyles.input}
                value={clientForm.name}
                onChangeText={(v) => setClientForm((f) => ({ ...f, name: v }))}
                placeholder="e.g. Myan Shwe War Co., Ltd"
                placeholderTextColor="#9ba3b8"
                autoFocus
              />

              <Text style={adminStyles.label}>Sector</Text>
              <TextInput
                style={adminStyles.input}
                value={clientForm.sector}
                onChangeText={(v) => setClientForm((f) => ({ ...f, sector: v }))}
                placeholder="e.g. Banking, FMCG, Retail"
                placeholderTextColor="#9ba3b8"
              />

              <Text style={adminStyles.label}>Tier</Text>
              <View style={adminStyles.chipRow}>
                {TIER_OPTIONS.map((t) => (
                  <Pressable
                    key={t === '' ? 'none' : t}
                    style={[
                      adminStyles.chip,
                      clientForm.tier === t && adminStyles.chipSelected,
                    ]}
                    onPress={() => setClientForm((f) => ({ ...f, tier: t }))}
                  >
                    <Text
                      style={[
                        adminStyles.chipText,
                        clientForm.tier === t && adminStyles.chipTextSelected,
                      ]}
                    >
                      {t === '' ? 'None' : t}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={adminStyles.label}>Status</Text>
              <View style={adminStyles.chipRow}>
                {(['active', 'inactive'] as const).map((s) => (
                  <Pressable
                    key={s}
                    style={[
                      adminStyles.chip,
                      clientForm.status === s && adminStyles.chipSelected,
                    ]}
                    onPress={() => setClientForm((f) => ({ ...f, status: s }))}
                  >
                    <Text
                      style={[
                        adminStyles.chipText,
                        clientForm.status === s && adminStyles.chipTextSelected,
                      ]}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={adminStyles.actions}>
                <Pressable
                  style={adminStyles.cancelBtn}
                  onPress={() => {
                    setClientModalVisible(false);
                    setClientForm(INITIAL_CLIENT_FORM);
                  }}
                >
                  <Text style={adminStyles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[adminStyles.submitBtn, clientSubmitting && adminStyles.submitBtnDisabled]}
                  onPress={() => void handleCreateClient()}
                  disabled={clientSubmitting}
                >
                  <Text style={adminStyles.submitBtnText}>
                    {clientSubmitting ? 'Creating…' : 'Create Client'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ─── Create Financial Quarter Modal ─── */}
      <Modal
        visible={quarterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setQuarterModalVisible(false)}
      >
        <View style={adminStyles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={adminStyles.sheetWrap}
          >
            <ScrollView style={adminStyles.sheet} contentContainerStyle={{ paddingBottom: 8 }}>
              <Text style={adminStyles.title}>New Financial Quarter</Text>

              <Text style={adminStyles.label}>Financial Year Name *</Text>
              <TextInput
                style={adminStyles.input}
                value={quarterForm.yearName}
                onChangeText={(v) => setQuarterForm((f) => ({ ...f, yearName: v }))}
                placeholder="e.g. FY 2026"
                placeholderTextColor="#9ba3b8"
                autoFocus
              />

              <Text style={adminStyles.label}>Year (number)</Text>
              <TextInput
                style={adminStyles.input}
                value={quarterForm.yearNumber}
                onChangeText={(v) => setQuarterForm((f) => ({ ...f, yearNumber: v }))}
                placeholder="e.g. 2026"
                placeholderTextColor="#9ba3b8"
                keyboardType="number-pad"
              />

              <Text style={adminStyles.label}>Quarter Name *</Text>
              <TextInput
                style={adminStyles.input}
                value={quarterForm.quarterName}
                onChangeText={(v) => setQuarterForm((f) => ({ ...f, quarterName: v }))}
                placeholder="e.g. Q1 FY2026"
                placeholderTextColor="#9ba3b8"
              />

              <Text style={adminStyles.label}>Quarter Number</Text>
              <View style={adminStyles.chipRow}>
                {QUARTER_OPTIONS.map((q) => (
                  <Pressable
                    key={q}
                    style={[
                      adminStyles.chip,
                      quarterForm.quarterNumber === q && adminStyles.chipSelected,
                    ]}
                    onPress={() => setQuarterForm((f) => ({ ...f, quarterNumber: q }))}
                  >
                    <Text
                      style={[
                        adminStyles.chipText,
                        quarterForm.quarterNumber === q && adminStyles.chipTextSelected,
                      ]}
                    >
                      Q{q}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={adminStyles.actions}>
                <Pressable
                  style={adminStyles.cancelBtn}
                  onPress={() => {
                    setQuarterModalVisible(false);
                    setQuarterForm(INITIAL_QUARTER_FORM);
                  }}
                >
                  <Text style={adminStyles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[
                    adminStyles.submitBtn,
                    quarterSubmitting && adminStyles.submitBtnDisabled,
                  ]}
                  onPress={() => void handleCreateQuarter()}
                  disabled={quarterSubmitting}
                >
                  <Text style={adminStyles.submitBtnText}>
                    {quarterSubmitting ? 'Creating…' : 'Create Quarter'}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const adminStyles = {
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end' as const,
  },
  sheetWrap: {
    width: '100%' as const,
  },
  sheet: {
    backgroundColor: '#1e2536',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  title: {
    fontFamily: 'System',
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#e8eaf0',
    marginBottom: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#8892a4',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: '#252d40',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: '#e8eaf0',
  },
  chipRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  chipSelected: {
    borderColor: '#14c0ae',
    backgroundColor: 'rgba(20,192,174,0.15)',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#8892a4',
  },
  chipTextSelected: {
    color: '#14c0ae',
    fontWeight: '600' as const,
  },
  actions: {
    flexDirection: 'row' as const,
    gap: 10,
    marginTop: 24,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center' as const,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#8892a4',
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#14c0ae',
    alignItems: 'center' as const,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#0d1117',
  },
};
