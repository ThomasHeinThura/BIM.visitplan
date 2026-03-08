import { StatusBar } from 'expo-status-bar';
import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, View } from 'react-native';
import { DEFAULT_API_BASE_URL } from './src/config';
import { Banner } from './src/components/Banner';
import { CalendarBoard } from './src/components/CalendarBoard';
import { LoginScreen } from './src/components/LoginScreen';
import { MetricCard } from './src/components/MetricCard';
import { VisitPlanModal } from './src/components/VisitPlanModal';
import { VisitPlanSummary } from './src/components/VisitPlanSummary';
import {
  ApiError,
  createVisitPlan,
  getMe,
  getVisitPlan,
  listResource,
  listVisitPlans,
  login,
  updateVisitPlan,
  updateVisitPlanStatus,
} from './src/lib/api';
import { styles } from './src/styles';
import type {
  AuthUser,
  LookupItem,
  VisitPlan,
  VisitPlanDraft,
  VisitPlanListResponse,
  VisitPlanPermissions,
} from './src/types';
import {
  buildDraftFromVisitPlan,
  createInitialDraft,
  derivePermissions,
  filterLookupItems,
  findLookupLabel,
  formatDateForApi,
  getMonthStart,
  mapLookupItem,
  sameIsoDate,
  toFriendlyMessage,
  validateDraft,
} from './src/utils/visitplan';

type BannerState = {
  tone: 'error' | 'success' | 'info';
  message: string;
};

type SessionState = {
  baseUrl: string;
  token: string;
  user: AuthUser;
  permissions: VisitPlanPermissions;
};

type LookupsState = {
  clients: LookupItem[];
  financialYears: LookupItem[];
  financialQuarters: LookupItem[];
  team: LookupItem[];
};

type LoginFormState = {
  baseUrl: string;
  email: string;
  password: string;
};

type ModalMode = 'create' | 'edit';

export default function App() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [loginForm, setLoginForm] = useState<LoginFormState>({
    baseUrl: DEFAULT_API_BASE_URL,
    email: '',
    password: '',
  });
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [visitPlans, setVisitPlans] = useState<VisitPlan[]>([]);
  const [visitPlanMeta, setVisitPlanMeta] = useState<VisitPlanListResponse['meta'] | null>(null);
  const [loadingVisitPlans, setLoadingVisitPlans] = useState(false);
  const [loadingSelectedVisitPlan, setLoadingSelectedVisitPlan] = useState(false);
  const [lookups, setLookups] = useState<LookupsState>({
    clients: [],
    financialYears: [],
    financialQuarters: [],
    team: [],
  });
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [selectedVisitPlan, setSelectedVisitPlan] = useState<VisitPlan | null>(null);
  const [meetingResultDraft, setMeetingResultDraft] = useState('');
  const [savingMeetingResult, setSavingMeetingResult] = useState(false);
  const [searchText, setSearchText] = useState('');
  const deferredSearchText = useDeferredValue(searchText);
  const [activeStatusFilter, setActiveStatusFilter] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => createInitialDraft().date);
  const [currentMonth, setCurrentMonth] = useState(() => getMonthStart(new Date()));
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [editingVisitPlanId, setEditingVisitPlanId] = useState<number | null>(null);
  const [draft, setDraft] = useState<VisitPlanDraft>(createInitialDraft());
  const [lookupQueries, setLookupQueries] = useState({
    client: '',
    financialYear: '',
    financialQuarter: '',
    team: '',
  });
  const [submittingDraft, setSubmittingDraft] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadDashboardData(session, {
      search: deferredSearchText,
      status: activeStatusFilter,
    });
  }, [session, deferredSearchText, activeStatusFilter]);

  useEffect(() => {
    setMeetingResultDraft(selectedVisitPlan?.description || '');
  }, [selectedVisitPlan]);

  const canAssignMembers = Boolean(session?.permissions.can_create);
  const visibleClients = filterLookupItems(lookups.clients, lookupQueries.client, 25);
  const visibleYears = filterLookupItems(lookups.financialYears, lookupQueries.financialYear, 25);
  const visibleQuarters = filterLookupItems(lookups.financialQuarters, lookupQueries.financialQuarter, 25);
  const visibleTeam = filterLookupItems(lookups.team, lookupQueries.team, 50);
  const selectedClientLabel = findLookupLabel(lookups.clients, draft.client_id);
  const selectedFinancialYearLabel = findLookupLabel(lookups.financialYears, draft.financial_year_id);
  const selectedFinancialQuarterLabel = findLookupLabel(lookups.financialQuarters, draft.financial_quarter_id);

  const plansForSelectedDate = useMemo(
    () => visitPlans.filter((item) => sameIsoDate(item.date, selectedDate)),
    [selectedDate, visitPlans],
  );

  async function handleLogin() {
    if (!loginForm.email || !loginForm.password || !loginForm.baseUrl) {
      setBanner({ tone: 'error', message: 'Base URL, email, and password are required.' });
      return;
    }

    setLoggingIn(true);
    setBanner({ tone: 'info', message: 'Signing in to the CRM API...' });

    try {
      const authResponse = await login(loginForm.baseUrl, loginForm.email, loginForm.password);
      const meResponse = await getMe(loginForm.baseUrl, authResponse.token).catch(() => null);
      const user = meResponse?.data ?? authResponse.user;
      const permissions = derivePermissions(
        user,
        meResponse?.visit_plan_permissions ?? authResponse.visit_plan_permissions,
      );

      if (!permissions.can_view) {
        throw new ApiError('This account does not have visit plan access.', 403);
      }

      setSession({
        baseUrl: loginForm.baseUrl,
        token: authResponse.token,
        user,
        permissions,
      });
      setBanner({ tone: 'success', message: 'Signed in. Loading visit plan workspace...' });
    } catch (error) {
      setBanner({ tone: 'error', message: toFriendlyMessage(error) });
    } finally {
      setLoggingIn(false);
    }
  }

  async function loadDashboardData(
    currentSession: SessionState,
    filters: { search: string; status: number | null },
  ) {
    setLoadingVisitPlans(true);
    setLoadingLookups(true);

    try {
      const [visitPlanResponse, clients, years, quarters, team] = await Promise.all([
        listVisitPlans(currentSession.baseUrl, currentSession.token, {
          q: filters.search.trim() || undefined,
          status: filters.status ?? undefined,
          per_page: 250,
        }),
        listResource(currentSession.baseUrl, currentSession.token, 'clients', 250),
        listResource(currentSession.baseUrl, currentSession.token, 'financial-years', 50),
        listResource(currentSession.baseUrl, currentSession.token, 'financial-quarters', 30),
        listResource(currentSession.baseUrl, currentSession.token, 'team', 250),
      ]);

      setVisitPlans(visitPlanResponse.data);
      setVisitPlanMeta(visitPlanResponse.meta);
      setLookups({
        clients: clients.map((item) => mapLookupItem(item, 'client')),
        financialYears: years.map((item) => mapLookupItem(item, 'financialYear')),
        financialQuarters: quarters.map((item) => mapLookupItem(item, 'financialQuarter')),
        team: team.map((item) => mapLookupItem(item, 'team')),
      });

      if (selectedVisitPlan) {
        const refreshed = visitPlanResponse.data.find((item) => item.id === selectedVisitPlan.id);
        setSelectedVisitPlan(refreshed || null);
      } else {
        const firstForSelectedDate = visitPlanResponse.data.find((item) => sameIsoDate(item.date, selectedDate));
        setSelectedVisitPlan(firstForSelectedDate || null);
      }
    } catch (error) {
      setBanner({ tone: 'error', message: toFriendlyMessage(error) });
    } finally {
      setLoadingVisitPlans(false);
      setLoadingLookups(false);
    }
  }

  async function handleSelectVisitPlan(visitPlanId: number) {
    if (!session) {
      return;
    }

    setLoadingSelectedVisitPlan(true);

    try {
      const response = await getVisitPlan(session.baseUrl, session.token, visitPlanId);
      setSelectedVisitPlan(response.data);
      setSelectedDate(response.data.date);
      setCurrentMonth(getMonthStart(new Date(response.data.date)));
    } catch (error) {
      setBanner({ tone: 'error', message: toFriendlyMessage(error) });
    } finally {
      setLoadingSelectedVisitPlan(false);
    }
  }

  function openCreateModal(date = selectedDate) {
    setModalMode('create');
    setEditingVisitPlanId(null);
    setDraft(createInitialDraft(date));
    setLookupQueries({ client: '', financialYear: '', financialQuarter: '', team: '' });
    setIsModalVisible(true);
  }

  function openEditModal(visitPlan: VisitPlan) {
    setModalMode('edit');
    setEditingVisitPlanId(visitPlan.id);
    setDraft(buildDraftFromVisitPlan(visitPlan));
    setLookupQueries({
      client: visitPlan.client_name || '',
      financialYear: visitPlan.financial_year_name || '',
      financialQuarter: visitPlan.financial_quarter_name || '',
      team: '',
    });
    setIsModalVisible(true);
  }

  function closeVisitPlanModal() {
    setIsModalVisible(false);
    setEditingVisitPlanId(null);
    setDraft(createInitialDraft(selectedDate));
    setLookupQueries({ client: '', financialYear: '', financialQuarter: '', team: '' });
  }

  async function handleSubmitVisitPlan() {
    if (!session) {
      return;
    }

    const validationError = validateDraft(draft);
    if (validationError) {
      setBanner({ tone: 'error', message: validationError });
      return;
    }

    setSubmittingDraft(true);

    try {
      const payload = {
        ...draft,
        date: formatDateForApi(draft.date),
        url: draft.url?.trim() || undefined,
        description: draft.description?.trim() || undefined,
        location_others: draft.location === 3 ? draft.location_others?.trim() || undefined : undefined,
      };
      const response = editingVisitPlanId
        ? await updateVisitPlan(session.baseUrl, session.token, editingVisitPlanId, payload)
        : await createVisitPlan(session.baseUrl, session.token, payload);

      setSelectedVisitPlan(response.data);
      setSelectedDate(response.data.date);
      setCurrentMonth(getMonthStart(new Date(response.data.date)));
      setMeetingResultDraft(response.data.description || '');
      closeVisitPlanModal();
      setBanner({
        tone: 'success',
        message: modalMode === 'edit' ? 'Visit plan updated successfully.' : 'Visit plan created successfully.',
      });

      await loadDashboardData(session, {
        search: deferredSearchText,
        status: activeStatusFilter,
      });
    } catch (error) {
      setBanner({ tone: 'error', message: toFriendlyMessage(error) });
    } finally {
      setSubmittingDraft(false);
    }
  }

  async function handleSaveMeetingResult() {
    if (!session || !selectedVisitPlan) {
      return;
    }

    setSavingMeetingResult(true);

    try {
      const response = await updateVisitPlan(session.baseUrl, session.token, selectedVisitPlan.id, {
        ...buildDraftFromVisitPlan(selectedVisitPlan),
        description: meetingResultDraft,
      });

      setSelectedVisitPlan(response.data);
      setVisitPlans((current) => current.map((item) => (item.id === response.data.id ? response.data : item)));
      setMeetingResultDraft(response.data.description || '');
      setBanner({ tone: 'success', message: 'Meeting result updated successfully.' });
    } catch (error) {
      setBanner({ tone: 'error', message: toFriendlyMessage(error) });
    } finally {
      setSavingMeetingResult(false);
    }
  }

  async function handleStatusUpdate(nextStatus: number) {
    if (!session || !selectedVisitPlan) {
      return;
    }

    setUpdatingStatus(nextStatus);

    try {
      const response = await updateVisitPlanStatus(session.baseUrl, session.token, selectedVisitPlan.id, nextStatus);
      setSelectedVisitPlan(response.data);
      setVisitPlans((current) => current.map((item) => (item.id === response.data.id ? response.data : item)));
      setBanner({ tone: 'success', message: 'Visit plan status updated successfully.' });
    } catch (error) {
      setBanner({ tone: 'error', message: toFriendlyMessage(error) });
    } finally {
      setUpdatingStatus(null);
    }
  }

  function handleLogout() {
    setSession(null);
    setVisitPlans([]);
    setVisitPlanMeta(null);
    setSelectedVisitPlan(null);
    setDraft(createInitialDraft());
    setMeetingResultDraft('');
    setIsModalVisible(false);
    setBanner({ tone: 'info', message: 'Signed out.' });
  }

  function handleChangeMonth(offset: number) {
    setCurrentMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function handleSelectDate(date: string) {
    setSelectedDate(date);
    const match = visitPlans.find((item) => sameIsoDate(item.date, date));
    setSelectedVisitPlan(match || null);
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <LoginScreen
          banner={banner}
          loggingIn={loggingIn}
          loginForm={loginForm}
          onChangeLoginForm={setLoginForm}
          onSubmit={() => {
            void handleLogin();
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.screenBackdrop} pointerEvents="none">
        <View style={[styles.backgroundOrb, styles.backgroundOrbTop]} />
        <View style={[styles.backgroundOrb, styles.backgroundOrbMiddle]} />
        <View style={[styles.backgroundOrb, styles.backgroundOrbBottom]} />
      </View>

      <View style={styles.appShell}>
        <View style={styles.heroHeader}>
          <MetricCard compact label="BIM Visitplan" value="Calendar Workspace" />
          <View style={styles.heroMeta}>
            <MetricCard compact label="User" value={`${session.user.first_name} ${session.user.last_name}`} />
            <MetricCard compact label="Scope" value={session.permissions.can_view_all ? 'Global' : 'Own'} />
            <MetricCard compact label="Create" value={session.permissions.can_create ? 'Enabled' : 'View only'} />
          </View>
        </View>

        {banner ? <Banner banner={banner} /> : null}

        <View style={styles.metricsRow}>
          <MetricCard label="Visible plans" value={String(visitPlanMeta?.total ?? 0)} />
          <MetricCard label="Connected API" value="UAT Ready" />
          <MetricCard label="Team assignment" value={canAssignMembers ? 'Available' : 'Restricted'} />
          <MetricCard label="Selected day" value={selectedDate} />
        </View>

        <View style={styles.contentRow}>
          <CalendarBoard
            currentMonth={currentMonth}
            selectedDate={selectedDate}
            visitPlans={visitPlans}
            loading={loadingVisitPlans}
            searchText={searchText}
            onChangeSearchText={setSearchText}
            activeStatusFilter={activeStatusFilter}
            onChangeStatusFilter={setActiveStatusFilter}
            onPreviousMonth={() => handleChangeMonth(-1)}
            onNextMonth={() => handleChangeMonth(1)}
            onSelectDate={handleSelectDate}
            onCreateVisitPlan={() => openCreateModal(selectedDate)}
            onRefresh={() => {
              void loadDashboardData(session, {
                search: deferredSearchText,
                status: activeStatusFilter,
              });
            }}
            plansForSelectedDate={plansForSelectedDate}
            onOpenVisitPlan={(id) => {
              void handleSelectVisitPlan(id);
            }}
            onEditVisitPlan={openEditModal}
          />

          <View style={styles.sideColumn}>
            {loadingSelectedVisitPlan ? (
              <View style={styles.sectionCard}>
                <ActivityIndicator color="#355CFF" />
              </View>
            ) : (
              <VisitPlanSummary
                selectedVisitPlan={selectedVisitPlan}
                meetingResultDraft={meetingResultDraft}
                onChangeMeetingResult={setMeetingResultDraft}
                onSaveMeetingResult={() => {
                  void handleSaveMeetingResult();
                }}
                savingMeetingResult={savingMeetingResult}
                updatingStatus={updatingStatus}
                onStatusUpdate={(status) => {
                  void handleStatusUpdate(status);
                }}
                onEditVisitPlan={openEditModal}
                onCreateVisitPlan={() => openCreateModal(selectedDate)}
                onLogout={handleLogout}
              />
            )}
          </View>
        </View>
      </View>

      <VisitPlanModal
        visible={isModalVisible}
        mode={modalMode}
        draft={draft}
        setDraft={setDraft}
        submitting={submittingDraft}
        loadingLookups={loadingLookups}
        canAssignMembers={canAssignMembers}
        visibleClients={visibleClients}
        visibleYears={visibleYears}
        visibleQuarters={visibleQuarters}
        visibleTeam={visibleTeam}
        lookupQueries={lookupQueries}
        setLookupQueries={setLookupQueries}
        selectedClientLabel={selectedClientLabel}
        selectedFinancialYearLabel={selectedFinancialYearLabel}
        selectedFinancialQuarterLabel={selectedFinancialQuarterLabel}
        onSubmit={() => {
          void handleSubmitVisitPlan();
        }}
        onClose={closeVisitPlanModal}
      />
    </SafeAreaView>
  );
}