import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTheme, fonts, radii } from '../context/ThemeContext';
import { getClients, getFinancialQuarters, getFinancialYears, upsertAgendaItem, upsertVisit } from '../lib/cockpit';
import type { CockpitClient, CockpitFinancialQuarter, CockpitFinancialYear, CockpitUser, MeetingGroup } from '../types';
import { Card, Icon, PrimaryButton, SearchBar, SecondaryButton } from './ui';
import { getVisitMeetingGroupOptions, normalizeMeetingGroup, formatMeetingGroup } from '../utils/meetingGroups';
import {
  addMinutes,
  formatDisplayTime,
  getCurrentOfficeScheduleDefaults,
  getOfficeTimeOptions,
  isOutsideOfficeHours,
} from '../utils/schedule';
import { buildCalendarDays, formatCalendarHeader, getMonthStart } from '../utils/visitplan';

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

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

type CreateStep = 1 | 2 | 3;

type GroupOption = Exclude<MeetingGroup, 'all'>;

const MEETING_GROUPS: Array<{ label: string; value: GroupOption }> = getVisitMeetingGroupOptions().map((value) => ({
  value,
  label: formatMeetingGroup(value),
}));

const VISIT_PURPOSES = ['Account Review', 'New Product', 'Collections', 'Follow Up'];
const START_TIME_OPTIONS = getOfficeTimeOptions(16 * 60);
const END_TIME_OPTIONS = getOfficeTimeOptions();

function getQuarterYearId(quarter: CockpitFinancialQuarter): string | null {
  const yearValue = quarter.year;
  if (!yearValue) return null;
  if (typeof yearValue === 'string') return yearValue;
  if (Array.isArray(yearValue)) {
    const firstValue = yearValue[0];
    if (!firstValue) return null;
    return typeof firstValue === 'string' ? firstValue : firstValue._id ?? null;
  }
  return yearValue._id ?? null;
}

export default function CreateVisitModal({
  visible,
  user,
  onClose,
  onSaved,
  preselectedClient,
}: Props) {
  const { theme, isDark } = useTheme();
  const defaultSchedule = useMemo(() => getCurrentOfficeScheduleDefaults(), [visible]);
  const preferredSectors = useMemo(() => user.owned_sectors?.filter(Boolean) ?? [], [user.owned_sectors]);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultSchedule.date);
  const [startTime, setStartTime] = useState(defaultSchedule.startTime);
  const [endTime, setEndTime] = useState(defaultSchedule.endTime);
  const [location, setLocation] = useState('');
  const [agenda, setAgenda] = useState('');
  const [meetingGroup, setMeetingGroup] = useState<GroupOption>((normalizeMeetingGroup(user.meeting_group) as GroupOption | null) ?? 'app');
  const [visitPurpose, setVisitPurpose] = useState('Account Review');
  const [agendaItems, setAgendaItems] = useState(['Review meeting goals', 'Capture agenda notes']);
  const [saving, setSaving] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [step, setStep] = useState<CreateStep>(1);

  const [clientSearch, setClientSearch] = useState('');
  const [clients, setClients] = useState<CockpitClient[]>([]);
  const [selectedClient, setSelectedClient] = useState<Pick<CockpitClient, '_id' | 'name'> | null>(
    preselectedClient ?? null,
  );
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientLoadError, setClientLoadError] = useState<string | null>(null);
  const [scheduleLookupLoading, setScheduleLookupLoading] = useState(false);
  const [scheduleLookupError, setScheduleLookupError] = useState<string | null>(null);
  const [financialYears, setFinancialYears] = useState<CockpitFinancialYear[]>([]);
  const [financialQuarters, setFinancialQuarters] = useState<CockpitFinancialQuarter[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
  const [selectedQuarterId, setSelectedQuarterId] = useState<string | null>(null);
  const [yearOverride, setYearOverride] = useState(false);
  const [quarterOverride, setQuarterOverride] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(() => getMonthStart(new Date()));
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState<'start' | 'end' | null>(null);

  useEffect(() => {
    if (visible) {
      const nextDefaults = getCurrentOfficeScheduleDefaults();
      setTitle('');
      setDate(nextDefaults.date);
      setStartTime(nextDefaults.startTime);
      setEndTime(nextDefaults.endTime);
      setLocation('');
      setAgenda('');
      setMeetingGroup((normalizeMeetingGroup(user.meeting_group) as GroupOption | null) ?? 'app');
      setVisitPurpose('Account Review');
      setAgendaItems(['Review meeting goals', 'Capture agenda notes']);
      setClientSearch('');
      setSelectedClient(preselectedClient ?? null);
      setSelectedYearId(null);
      setSelectedQuarterId(null);
      setYearOverride(false);
      setQuarterOverride(false);
      setSaving(false);
      setClientError(null);
      setClientLoadError(null);
      setScheduleLookupError(null);
      setStep(preselectedClient ? 2 : 1);
      setPickerMonth(getMonthStart(new Date(`${nextDefaults.date}T00:00:00`)));
      setDatePickerOpen(false);
      setTimePickerTarget(null);
    }
  }, [visible, preselectedClient]);

  const openTimePicker = (target: 'start' | 'end') => {
    setTimePickerTarget(target);
  };

  const applyTimeSelection = (nextValue: string) => {
    if (timePickerTarget === 'start') {
      setStartTime(nextValue);
      setEndTime(addMinutes(nextValue, 60));
    }
    if (timePickerTarget === 'end') {
      setEndTime(nextValue);
    }
    setTimePickerTarget(null);
  };

  const loadClients = useCallback(async () => {
    setClientsLoading(true);
    setClientLoadError(null);
    try {
      const clientData = await getClients({ limit: 300, sort: { name: 1 } });
      const preferredSet = new Set(preferredSectors);
      const sortedClients = [...clientData].sort((left, right) => {
        const leftPreferred = !!left.sector && preferredSet.has(left.sector);
        const rightPreferred = !!right.sector && preferredSet.has(right.sector);
        if (leftPreferred !== rightPreferred) return leftPreferred ? -1 : 1;
        return left.name.localeCompare(right.name);
      });
      setClients(sortedClients);
    } catch {
      setClientLoadError('Could not load clients. Please try again.');
    } finally {
      setClientsLoading(false);
    }
  }, [preferredSectors]);

  const loadScheduleLookups = useCallback(async () => {
    setScheduleLookupLoading(true);
    setScheduleLookupError(null);
    try {

      const [yearData, quarterData] = await Promise.all([
        getFinancialYears({ limit: 20 }),
        getFinancialQuarters({ limit: 120 }),
      ]);

      setFinancialYears(yearData);
      setFinancialQuarters(quarterData);

      const initialYearId = yearData[0]?._id ?? null;
      setSelectedYearId((current) => current ?? initialYearId);
      setSelectedQuarterId((current) => {
        if (current) return current;
        const initialQuarter = quarterData.find((quarter) => getQuarterYearId(quarter) === initialYearId) ?? quarterData[0] ?? null;
        return initialQuarter?._id ?? null;
      });
    } catch {
      setScheduleLookupError('Could not load visit setup data. Please try again.');
    } finally {
      setScheduleLookupLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible && clients.length === 0) {
      loadClients();
    }
  }, [visible, clients.length, loadClients]);

  useEffect(() => {
    if (visible && step === 3 && (financialYears.length === 0 || financialQuarters.length === 0)) {
      loadScheduleLookups();
    }
  }, [visible, step, financialYears.length, financialQuarters.length, loadScheduleLookups]);

  const filteredClients = clients.filter((c) => {
    const query = clientSearch.trim().toLowerCase();
    if (!query) return true;
    return c.name.toLowerCase().includes(query) || (c.sector ?? '').toLowerCase().includes(query);
  });

  const canGoNext =
    step === 1 ? selectedClient != null
    : step === 2 ? title.trim().length > 0
    : true;

  const yearMatchedQuarters = selectedYearId
    ? financialQuarters.filter((quarter) => getQuarterYearId(quarter) === selectedYearId)
    : financialQuarters;
  const visibleQuarters = yearMatchedQuarters.length > 0 ? yearMatchedQuarters : financialQuarters;
  const selectedYear = financialYears.find((year) => year._id === selectedYearId) ?? null;
  const selectedQuarter = financialQuarters.find((quarter) => quarter._id === selectedQuarterId) ?? null;
  const calendarDays = useMemo(() => buildCalendarDays(pickerMonth, []), [pickerMonth]);
  const hasOfficeHourWarning = isOutsideOfficeHours(startTime) || isOutsideOfficeHours(endTime);

  useEffect(() => {
    if (!visible) return;
    const nextDate = new Date(`${date}T00:00:00`);
    if (!Number.isNaN(nextDate.getTime())) {
      setPickerMonth(getMonthStart(nextDate));
    }
  }, [date, visible]);

  useEffect(() => {
    if (!financialYears.length || !financialQuarters.length || !date) return;

    const nextDate = new Date(`${date}T00:00:00`);
    if (Number.isNaN(nextDate.getTime())) return;

    const yearMatch = financialYears.find((year) => year.year === nextDate.getFullYear()) ?? financialYears[0] ?? null;
    const quarterNumber = (Math.floor(nextDate.getMonth() / 3) + 1) as 1 | 2 | 3 | 4;
    const quarterMatch = financialQuarters.find((quarter) => getQuarterYearId(quarter) === yearMatch?._id && quarter.quarter_number === quarterNumber)
      ?? financialQuarters.find((quarter) => quarter.quarter_number === quarterNumber)
      ?? null;

    if (yearMatch && !yearOverride && selectedYearId !== yearMatch._id) {
      setSelectedYearId(yearMatch._id);
    }
    if (quarterMatch && !quarterOverride && selectedQuarterId !== quarterMatch._id) {
      setSelectedQuarterId(quarterMatch._id);
    }
  }, [date, financialYears, financialQuarters, selectedYearId, selectedQuarterId, yearOverride, quarterOverride]);

  const goNext = () => {
    if (step === 1) {
      if (!selectedClient) {
        setClientError('Please select a client before continuing.');
        return;
      }
      setClientError(null);
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!title.trim()) {
        Alert.alert('Required', 'Please enter a visit title.');
        return;
      }
      if (!agendaItems.some((item) => item.trim())) {
        Alert.alert('Required', 'Please add at least one agenda item.');
        return;
      }
      if (!location.trim() && selectedClient) {
        setLocation(selectedClient.name);
      }
      setStep(3);
    }
  };

  const goBack = () => {
    if (step === 1) {
      onClose();
      return;
    }
    setStep((current) => (current === 3 ? 2 : 1));
  };

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
    if (isOutsideOfficeHours(startTime) || isOutsideOfficeHours(endTime)) {
      Alert.alert('Outside office hours', 'Visit times must be between 9:00 AM and 5:00 PM.');
      return;
    }
    setSaving(true);
    try {
      const cleanedAgendaItems = agendaItems.map((item) => item.trim()).filter(Boolean);
      const agendaSummary = [
        `Purpose: ${visitPurpose}`,
        ...cleanedAgendaItems.map((item, index) => `${index + 1}. ${item}`),
        agenda.trim() ? `Notes: ${agenda.trim()}` : '',
      ].filter(Boolean).join('\n');

      const createdVisit = await upsertVisit({
        title: title.trim(),
        date,
        start_time: startTime || undefined,
        end_time: endTime || undefined,
        location: location.trim() || undefined,
        agenda: agendaSummary,
        meeting_group: meetingGroup,
        status: 'scheduled',
        client: selectedClient
          ? { _id: selectedClient._id, name: selectedClient.name }
          : undefined,
        financial_year: selectedYear ? { _id: selectedYear._id, name: selectedYear.name } : undefined,
        financial_quarter: selectedQuarter ? { _id: selectedQuarter._id, name: selectedQuarter.name } : undefined,
        assigned_am: { _id: user._id, name: user.name },
      });

      await Promise.allSettled(
        cleanedAgendaItems.map((item, index) => upsertAgendaItem({
          visit: { _id: createdVisit._id, title: createdVisit.title },
          title: item,
          order: index + 1,
          completed: false,
          created_by: { _id: user._id, name: user.name },
        })),
      );

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
      backgroundColor: 'rgba(0,0,0,0.62)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: theme.bg,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      maxHeight: '92%',
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 28,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: radii.full,
      backgroundColor: theme.border,
      alignSelf: 'center',
      marginBottom: 12,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
      fontFamily: fonts.display,
    },
    closeBtn: {
      width: 28,
      height: 28,
      borderRadius: radii.full,
      backgroundColor: theme.surfaceOffset,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 14,
    },
    stepCol: { alignItems: 'center', gap: 2 },
    stepNum: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepLabel: {
      fontSize: 10,
      fontWeight: '700',
      fontFamily: fonts.display,
    },
    stepConnector: {
      flex: 1,
      height: 2,
      marginHorizontal: 4,
      marginTop: 11,
      borderRadius: radii.full,
    },
    section: { paddingBottom: 8 },
    label: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.textSecondary,
      marginTop: 14,
      marginBottom: 5,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    input: {
      backgroundColor: theme.inputBg,
      borderWidth: 1.5,
      borderColor: theme.inputBorder,
      borderRadius: radii.md,
      paddingHorizontal: 12,
      paddingVertical: 11,
      fontSize: 14,
      color: theme.text,
    },
    textArea: { minHeight: 84, textAlignVertical: 'top' },
    row: { flexDirection: 'row', gap: 8 },
    halfInput: { flex: 1 },
    helperCard: {
      backgroundColor: theme.surfaceOffset,
      borderRadius: radii.md,
      paddingHorizontal: 10,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    },
    helperCardStretch: { alignItems: 'stretch' },
    optionChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
    selectChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radii.full,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surfaceOffset,
    },
    selectChipActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryLight,
    },
    selectChipText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.textSecondary,
      fontFamily: fonts.display,
    },
    selectChipTextActive: {
      color: theme.primary,
      fontWeight: '700',
    },
    selectionCard: {
      backgroundColor: theme.surfaceOffset,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: theme.primary,
      paddingHorizontal: 10,
      paddingVertical: 9,
      marginBottom: 8,
    },
    selectionValue: {
      fontSize: 12,
      color: theme.primary,
      fontWeight: '700',
      fontFamily: fonts.display,
    },
    selectionHint: {
      fontSize: 10,
      color: theme.textSecondary,
      marginTop: 2,
    },
    warningCard: {
      backgroundColor: theme.warningLight,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: theme.warning,
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginTop: 8,
      marginBottom: 6,
    },
    warningText: {
      fontSize: 11,
      color: theme.text,
      lineHeight: 16,
    },
    purposeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
    purposeChip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: radii.full,
      borderWidth: 1,
    },
    purposeChipActive: {
      backgroundColor: theme.primaryLight,
      borderColor: theme.primary,
    },
    purposeChipText: {
      fontSize: 12,
      color: theme.textSecondary,
      fontWeight: '600',
    },
    purposeChipTextActive: {
      color: theme.primary,
      fontWeight: '700',
    },
    agendaCard: { padding: 0, marginBottom: 10 },
    agendaRow: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      alignItems: 'center',
    },
    agendaNum: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.surfaceOffset,
      alignItems: 'center',
      justifyContent: 'center',
    },
    agendaItemInput: {
      flex: 1,
      minHeight: 42,
      paddingVertical: 0,
      color: theme.text,
      fontSize: 13,
      fontWeight: '600',
      fontFamily: fonts.display,
    },
    agendaAddRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: theme.divider,
    },
    infoBanner: {
      backgroundColor: theme.purpleLight,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(167,139,250,0.25)' : 'rgba(139,92,246,0.2)',
      borderRadius: radii.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 12,
    },
    lookupWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
    clientListWrap: { maxHeight: 360 },
    datePickerCard: {
      backgroundColor: theme.surfaceOffset,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 8,
      marginTop: 4,
      marginBottom: 8,
    },
    pickerTrigger: {
      backgroundColor: theme.inputBg,
      borderWidth: 1.5,
      borderColor: theme.inputBorder,
      borderRadius: radii.md,
      paddingHorizontal: 10,
      paddingVertical: 9,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    calendarNavRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    calendarInner: {
      width: '100%',
      maxWidth: 320,
      alignSelf: 'center',
    },
    calendarActionRow: { flexDirection: 'row', gap: 8 },
    calendarActionBtn: {
      paddingHorizontal: 7,
      paddingVertical: 4,
      borderRadius: radii.full,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.bg,
    },
    calendarMonthTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.text,
      fontFamily: fonts.display,
      marginBottom: 5,
    },
    calendarWeekHeaderRow: { flexDirection: 'row', marginBottom: 2 },
    calendarWeekHeaderText: { flex: 1, textAlign: 'center', fontSize: 8, color: theme.textFaint, fontWeight: '700' },
    calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
    calendarCell: {
      width: '13.5%',
      aspectRatio: 1,
      borderRadius: 7,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.bg,
      borderWidth: 1,
      borderColor: theme.border,
    },
    calendarCellMuted: { opacity: 0.45 },
    calendarCellActive: {
      backgroundColor: theme.primaryLight,
      borderColor: theme.primary,
    },
    calendarCellText: { fontSize: 9, color: theme.textSecondary },
    calendarCellTextActive: { fontSize: 9, color: theme.primary, fontWeight: '700' },
    timePickerCard: {
      marginTop: 4,
      padding: 8,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surfaceOffset,
    },
    timeOptionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    actionsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
    emptyState: { paddingVertical: 22, alignItems: 'center' },
  });

  const stepMeta = [
    { stepValue: 1 as CreateStep, label: 'Client' },
    { stepValue: 2 as CreateStep, label: 'Agenda' },
    { stepValue: 3 as CreateStep, label: 'Schedule' },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.sheet}>
          <View style={s.handle} />
          <View style={s.headerRow}>
            <Text style={s.headerTitle}>New Visit</Text>
            <Pressable onPress={onClose} hitSlop={10} style={s.closeBtn}>
              <Text style={{ fontSize: 18, color: theme.textSecondary, lineHeight: 18 }}>×</Text>
            </Pressable>
          </View>

          <View style={s.stepRow}>
            {stepMeta.map((item, index) => {
              const active = step === item.stepValue;
              const done = step > item.stepValue;
              return (
                <React.Fragment key={item.stepValue}>
                  <View style={s.stepCol}>
                    <View style={[s.stepNum, {
                      backgroundColor: active || done ? theme.primary : theme.surfaceOffset,
                      borderColor: active || done ? theme.primary : theme.border,
                    }]}> 
                      <Text style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: active || done ? '#fff' : theme.textSecondary,
                        fontFamily: fonts.display,
                      }}>{item.stepValue}</Text>
                    </View>
                    <Text style={[s.stepLabel, { color: active || done ? theme.primary : theme.textFaint }]}>{item.label}</Text>
                  </View>
                  {index < stepMeta.length - 1 ? (
                    <View style={[s.stepConnector, { backgroundColor: step > item.stepValue ? theme.primary : theme.border }]} />
                  ) : null}
                </React.Fragment>
              );
            })}
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {step === 1 ? (
              <View style={s.section}>
                <SearchBar value={clientSearch} onChange={setClientSearch} placeholder="Search client by name or sector…" />
                {clientError ? (
                  <Text style={{ color: theme.error, fontSize: 12, marginTop: 6 }}>{clientError}</Text>
                ) : null}
                {clientLoadError ? (
                  <View style={[s.helperCard, { marginTop: 10, justifyContent: 'space-between' }]}>
                    <Text style={{ flex: 1, fontSize: 12, color: theme.error }}>{clientLoadError}</Text>
                    <Pressable onPress={() => void loadClients()} hitSlop={8}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: theme.primary }}>Retry</Text>
                    </Pressable>
                  </View>
                ) : null}
                <Card style={{ padding: 0, marginTop: 10 }}>
                  {clientsLoading ? (
                    <View style={s.emptyState}>
                      <ActivityIndicator color={theme.primary} />
                    </View>
                  ) : filteredClients.length === 0 ? (
                    <View style={s.emptyState}>
                      <Text style={{ fontSize: 13, color: theme.textSecondary }}>No clients found.</Text>
                    </View>
                  ) : (
                    <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={s.clientListWrap}>
                      {filteredClients.map((client, index) => {
                        const active = selectedClient?._id === client._id;
                        return (
                          <Pressable
                            key={client._id}
                            onPress={() => {
                              setSelectedClient({ _id: client._id, name: client.name });
                              setClientError(null);
                            }}
                            style={({ pressed }) => [{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 10,
                              paddingHorizontal: 14,
                              paddingVertical: 11,
                              backgroundColor: active ? theme.primaryLight : 'transparent',
                              borderTopLeftRadius: index === 0 ? radii.md : 0,
                              borderTopRightRadius: index === 0 ? radii.md : 0,
                              borderBottomLeftRadius: index === filteredClients.length - 1 ? radii.md : 0,
                              borderBottomRightRadius: index === filteredClients.length - 1 ? radii.md : 0,
                            }, index > 0 && { borderTopWidth: 1, borderTopColor: theme.divider }, pressed && { opacity: 0.8 }]}
                          >
                            <View style={{
                              width: 36, height: 36, borderRadius: 10,
                              backgroundColor: active ? theme.primary : theme.surfaceOffset,
                              alignItems: 'center', justifyContent: 'center',
                            }}>
                              <Text style={{
                                fontSize: 12,
                                fontWeight: '700',
                                color: active ? '#fff' : theme.textSecondary,
                                fontFamily: fonts.display,
                              }}>{getInitials(client.name)}</Text>
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text, fontFamily: fonts.display }} numberOfLines={1}>{client.name}</Text>
                              <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }} numberOfLines={1}>
                                {[client.sector, client.account_type, client.status].filter(Boolean).join(' · ')}
                              </Text>
                            </View>
                            <Icon.ChevronRight size={14} color={active ? theme.primary : theme.textFaint} />
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  )}
                </Card>
              </View>
            ) : null}

            {step === 2 ? (
              <View style={s.section}>
                {selectedClient ? (
                  <View style={s.helperCard}>
                    <View style={{
                      width: 28, height: 28, borderRadius: 8,
                      backgroundColor: theme.primary,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', fontFamily: fonts.display }}>{getInitials(selectedClient.name)}</Text>
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text, fontFamily: fonts.display }}>{selectedClient.name}</Text>
                  </View>
                ) : null}

                <Text style={s.label}>Department</Text>
                <View style={s.purposeRow}>
                  {MEETING_GROUPS.map((group) => {
                    const active = meetingGroup === group.value;
                    return (
                      <Pressable key={group.value} onPress={() => setMeetingGroup(group.value)} style={[s.purposeChip, active && s.purposeChipActive]}>
                        <Text style={[s.purposeChipText, active && s.purposeChipTextActive]}>{group.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={s.label}>Visit Purpose</Text>
                <View style={s.purposeRow}>
                  {VISIT_PURPOSES.map((purpose) => {
                    const active = visitPurpose === purpose;
                    return (
                      <Pressable key={purpose} onPress={() => setVisitPurpose(purpose)} style={[s.purposeChip, active && s.purposeChipActive]}>
                        <Text style={[s.purposeChipText, active && s.purposeChipTextActive]}>{purpose}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={s.label}>Visit Title</Text>
                <TextInput
                  style={s.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Visit purpose or meeting name"
                  placeholderTextColor={theme.textSecondary}
                  returnKeyType="next"
                />

                <Text style={s.label}>Agenda Items</Text>
                <Card style={s.agendaCard}>
                  {agendaItems.map((item, index) => (
                    <View key={`agenda-${index}`} style={[s.agendaRow, index > 0 && { borderTopWidth: 1, borderTopColor: theme.divider }]}>
                      <View style={s.agendaNum}><Text style={{ fontSize: 11, color: theme.textSecondary, fontWeight: '700' }}>{index + 1}</Text></View>
                      <TextInput
                        style={s.agendaItemInput}
                        value={item}
                        onChangeText={(value) => setAgendaItems((current) => current.map((entry, entryIndex) => entryIndex === index ? value : entry))}
                        placeholder={`Agenda item ${index + 1}`}
                        placeholderTextColor={theme.textSecondary}
                      />
                      {agendaItems.length > 1 ? (
                        <Pressable onPress={() => setAgendaItems((current) => current.filter((_, entryIndex) => entryIndex !== index))} hitSlop={8}>
                          <Text style={{ fontSize: 16, color: theme.textFaint }}>×</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ))}
                  <View style={s.agendaAddRow}>
                    <Text style={{ fontSize: 12, color: theme.textSecondary }}>Add another agenda item</Text>
                    <Pressable onPress={() => setAgendaItems((current) => [...current, ''])} hitSlop={8}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: theme.primary }}>+ Add</Text>
                    </Pressable>
                  </View>
                </Card>

                <Text style={s.label}>Agenda Notes</Text>
                <TextInput
                  style={[s.input, s.textArea]}
                  value={agenda}
                  onChangeText={setAgenda}
                  placeholder="Pre-visit notes or objectives…"
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={4}
                />
              </View>
            ) : null}

            {step === 3 ? (
              <View style={s.section}>
                {selectedClient ? (
                  <View style={s.helperCard}>
                    <View style={{
                      width: 28, height: 28, borderRadius: 8,
                      backgroundColor: theme.primary,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', fontFamily: fonts.display }}>{getInitials(selectedClient.name)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text, fontFamily: fonts.display }}>{selectedClient.name}</Text>
                      <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 1 }}>{title || 'New visit'}</Text>
                    </View>
                  </View>
                ) : null}

                <Text style={s.label}>Date</Text>
                <Pressable style={s.pickerTrigger} onPress={() => setDatePickerOpen((current) => !current)}>
                  <Text style={{ fontSize: 13, color: theme.text, fontWeight: '600', fontFamily: fonts.display }}>{date}</Text>
                  <Icon.Calendar size={16} color={theme.textSecondary} />
                </Pressable>
                {datePickerOpen ? (
                  <View style={s.datePickerCard}>
                    <View style={s.calendarInner}>
                      <View style={s.calendarNavRow}>
                        <Text style={{ fontSize: 11, color: theme.textSecondary, fontWeight: '700' }}>Choose date</Text>
                        <View style={s.calendarActionRow}>
                          <Pressable onPress={() => setPickerMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} style={s.calendarActionBtn}>
                            <Text style={{ fontSize: 11, color: theme.text }}>Prev</Text>
                          </Pressable>
                          <Pressable onPress={() => setPickerMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} style={s.calendarActionBtn}>
                            <Text style={{ fontSize: 11, color: theme.text }}>Next</Text>
                          </Pressable>
                        </View>
                      </View>
                      <Text style={s.calendarMonthTitle}>{formatCalendarHeader(pickerMonth)}</Text>
                      <View style={s.calendarWeekHeaderRow}>
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                          <Text key={day} style={s.calendarWeekHeaderText}>{day}</Text>
                        ))}
                      </View>
                      <View style={s.calendarGrid}>
                        {calendarDays.map((day) => (
                          <Pressable
                            key={day.isoDate}
                            onPress={() => {
                              setDate(day.isoDate);
                              setDatePickerOpen(false);
                            }}
                            style={[
                              s.calendarCell,
                              !day.isCurrentMonth && s.calendarCellMuted,
                              date === day.isoDate && s.calendarCellActive,
                            ]}
                          >
                            <Text style={date === day.isoDate ? s.calendarCellTextActive : s.calendarCellText}>{day.dayOfMonth}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  </View>
                ) : null}

                {scheduleLookupError ? (
                  <View style={[s.helperCard, s.helperCardStretch, { marginTop: 8, justifyContent: 'space-between' }]}>
                    <Text style={{ flex: 1, fontSize: 12, color: theme.error }}>{scheduleLookupError}</Text>
                    <Pressable onPress={() => void loadScheduleLookups()} hitSlop={8} style={{ marginTop: 6 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: theme.primary }}>Retry visit setup data</Text>
                    </Pressable>
                  </View>
                ) : null}

                <Text style={s.label}>Financial Year</Text>
                <View style={s.selectionCard}>
                  <Text style={s.selectionValue}>
                    {selectedYear?.name ?? (scheduleLookupLoading ? 'Loading…' : 'Auto from selected date')}
                  </Text>
                  <Text style={s.selectionHint}>Selected from the visit date. Tap a year below to override.</Text>
                </View>
                {financialYears.length > 0 ? (
                  <View style={s.optionChipRow}>
                    {financialYears.map((year) => {
                      const active = year._id === selectedYearId;
                      return (
                        <Pressable
                          key={year._id}
                          onPress={() => {
                            setSelectedYearId(year._id);
                            setYearOverride(true);
                            const nextQuarter = financialQuarters.find((quarter) => getQuarterYearId(quarter) === year._id)
                              ?? financialQuarters.find((quarter) => quarter._id === selectedQuarterId)
                              ?? financialQuarters[0]
                              ?? null;
                            if (nextQuarter) {
                              setSelectedQuarterId(nextQuarter._id);
                              setQuarterOverride(true);
                            }
                          }}
                          style={[s.selectChip, active && s.selectChipActive]}
                        >
                          <Text style={[s.selectChipText, active && s.selectChipTextActive]}>{year.name}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}

                <Text style={s.label}>Financial Quarter</Text>
                <View style={s.selectionCard}>
                  <Text style={s.selectionValue}>
                    {selectedQuarter?.name ?? (scheduleLookupLoading ? 'Loading…' : 'Auto from selected date')}
                  </Text>
                  <Text style={s.selectionHint}>Selected from the visit date. Tap a quarter below to override.</Text>
                </View>
                {visibleQuarters.length > 0 ? (
                  <View style={s.optionChipRow}>
                    {visibleQuarters.map((quarter) => {
                      const active = quarter._id === selectedQuarterId;
                      return (
                        <Pressable
                          key={quarter._id}
                          onPress={() => {
                            setSelectedQuarterId(quarter._id);
                            setQuarterOverride(true);
                          }}
                          style={[s.selectChip, active && s.selectChipActive]}
                        >
                          <Text style={[s.selectChipText, active && s.selectChipTextActive]}>{quarter.name}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}

                <View style={s.row}>
                  <View style={s.halfInput}>
                    <Text style={s.label}>Start Time</Text>
                    <Pressable style={s.pickerTrigger} onPress={() => openTimePicker('start')}>
                      <Text style={{ fontSize: 13, color: theme.text, fontWeight: '600', fontFamily: fonts.display }}>{formatDisplayTime(startTime)}</Text>
                      <Icon.Clock size={16} color={theme.textSecondary} />
                    </Pressable>
                  </View>
                  <View style={s.halfInput}>
                    <Text style={s.label}>End Time</Text>
                    <Pressable style={s.pickerTrigger} onPress={() => openTimePicker('end')}>
                      <Text style={{ fontSize: 13, color: theme.text, fontWeight: '600', fontFamily: fonts.display }}>{formatDisplayTime(endTime)}</Text>
                      <Icon.Clock size={16} color={theme.textSecondary} />
                    </Pressable>
                  </View>
                </View>
                {hasOfficeHourWarning ? (
                  <View style={s.warningCard}>
                    <Text style={s.warningText}>Office hours are 9:00 AM to 5:00 PM. This visit is currently outside office hours.</Text>
                  </View>
                ) : null}

                {timePickerTarget ? (
                  <View style={s.timePickerCard}>
                    <Text style={{ fontSize: 12, color: theme.textSecondary, fontWeight: '700', marginBottom: 10 }}>
                      {timePickerTarget === 'start' ? 'Choose start time' : 'Choose end time'}
                    </Text>
                    <View style={s.timeOptionGrid}>
                      {(timePickerTarget === 'start' ? START_TIME_OPTIONS : END_TIME_OPTIONS).map((timeValue) => {
                        const active = (timePickerTarget === 'start' ? startTime : endTime) === timeValue;
                        return (
                          <Pressable
                            key={`${timePickerTarget}-${timeValue}`}
                            onPress={() => applyTimeSelection(timeValue)}
                            style={[s.selectChip, active && s.selectChipActive]}
                          >
                            <Text style={[s.selectChipText, active && s.selectChipTextActive]}>{formatDisplayTime(timeValue)}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <View style={{ marginTop: 10 }}>
                      <SecondaryButton label="Close" onPress={() => setTimePickerTarget(null)} />
                    </View>
                  </View>
                ) : null}

                <Text style={s.label}>Location</Text>
                <TextInput
                  style={s.input}
                  value={location}
                  onChangeText={setLocation}
                  placeholder="Address or place name"
                  placeholderTextColor={theme.textSecondary}
                />

                <View style={s.infoBanner}>
                  <Text style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, color: theme.purple, marginBottom: 4 }}>
                    Instruction
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.text, lineHeight: 18 }}>
                    Finalize timing and meeting instructions before creating the visit plan.
                  </Text>
                </View>
              </View>
            ) : null}

            <View style={s.actionsRow}>
              <View style={{ flex: 1 }}>
                <SecondaryButton label={step === 1 ? 'Cancel' : 'Back'} onPress={goBack} />
              </View>
              <View style={{ flex: 1.4 }}>
                {step < 3 ? (
                  <PrimaryButton label={step === 1 ? 'Select Client & Continue' : 'Next: Schedule'} onPress={goNext} disabled={!canGoNext} />
                ) : (
                  <PrimaryButton
                    label={saving ? 'Creating…' : 'Create Visit'}
                    onPress={handleSave}
                    disabled={saving}
                    icon={saving ? <ActivityIndicator size="small" color="#fff" /> : undefined}
                  />
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
