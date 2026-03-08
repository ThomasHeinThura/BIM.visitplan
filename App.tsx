import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useDeferredValue, useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, useWindowDimensions, View } from 'react-native';
import { DEFAULT_API_BASE_URL } from './src/config';
import { Banner } from './src/components/Banner';
import { CalendarBoard } from './src/components/CalendarBoard';
import { LoginScreen } from './src/components/LoginScreen';
import { VisitPlanModal } from './src/components/VisitPlanModal';
import { VisitPlanSummary } from './src/components/VisitPlanSummary';
import {
  ApiError,
  createVisitPlan,
  getMe,
  listResource,
  listVisitPlans,
  login,
  updateVisitPlan,
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
  formatWeekRange,
  getWeekBounds,
  mapLookupItem,
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
const SESSION_STORAGE_KEY = 'bim.visitplan.session';

export default function App() {
  const { width } = useWindowDimensions();
  const isCompactLayout = width < 980;
  const [session, setSession] = useState<SessionState | null>(null);
  const [restoringSession, setRestoringSession] = useState(true);
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
  const [lookups, setLookups] = useState<LookupsState>({
    clients: [],
    financialYears: [],
    financialQuarters: [],
    team: [],
  });
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [searchText, setSearchText] = useState('');
  const deferredSearchText = useDeferredValue(searchText);
  const [activeStatusFilter, setActiveStatusFilter] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => createInitialDraft().date);
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

  useEffect(() => {
    void restorePersistedSession();
  }, []);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadDashboardData(session, {
      search: deferredSearchText,
      status: activeStatusFilter,
    });
  }, [session, deferredSearchText, activeStatusFilter]);

  const canAssignMembers = Boolean(session?.permissions.can_create || session?.permissions.can_edit);
  const visibleClients = filterLookupItems(lookups.clients, lookupQueries.client, 25);
  const visibleYears = filterLookupItems(lookups.financialYears, lookupQueries.financialYear, 25);
  const visibleQuarters = filterLookupItems(lookups.financialQuarters, lookupQueries.financialQuarter, 25);
  const visibleTeam = filterLookupItems(lookups.team, lookupQueries.team, 50);
  const selectedClientLabel = findLookupLabel(lookups.clients, draft.client_id);
  const selectedFinancialYearLabel = findLookupLabel(lookups.financialYears, draft.financial_year_id);
  const selectedFinancialQuarterLabel = findLookupLabel(lookups.financialQuarters, draft.financial_quarter_id);
  const currentWeek = getWeekBounds(new Date());
  const weeklyPlans = visitPlans.filter(
    (visitPlan) => visitPlan.date >= currentWeek.start && visitPlan.date <= currentWeek.end,
  ).length;
  const weekRangeLabel = formatWeekRange(currentWeek.start, currentWeek.end);

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

      const nextSession = {
        baseUrl: loginForm.baseUrl,
        token: authResponse.token,
        user,
        permissions,
      };

      setSession(nextSession);
      await persistSession(nextSession);
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
    } catch (error) {
      setBanner({ tone: 'error', message: toFriendlyMessage(error) });
    } finally {
      setLoadingVisitPlans(false);
      setLoadingLookups(false);
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

      setSelectedDate(response.data.date);
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

  function handleLogout() {
    setSession(null);
    setVisitPlans([]);
    setVisitPlanMeta(null);
    setDraft(createInitialDraft());
    setIsModalVisible(false);
    setBanner({ tone: 'info', message: 'Signed out.' });
    void clearPersistedSession();
  }

  function handleSelectDate(date: string) {
    setSelectedDate(date);
  }

  function handleShiftScheduleWindow(offset: number) {
    const nextDate = shiftIsoDate(selectedDate, offset);
    setSelectedDate(nextDate);
  }

  if (restoringSession) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.screenBackdrop} pointerEvents="none">
          <View style={[styles.backgroundOrb, styles.backgroundOrbTop]} />
          <View style={[styles.backgroundOrb, styles.backgroundOrbMiddle]} />
          <View style={[styles.backgroundOrb, styles.backgroundOrbBottom]} />
        </View>
        <View style={styles.restoreShell} />
      </SafeAreaView>
    );
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

      <ScrollView contentContainerStyle={styles.appScrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.appShell}>
          {banner ? <Banner banner={banner} /> : null}

          <View style={[styles.contentRow, isCompactLayout ? styles.contentRowStacked : null]}>
            {isCompactLayout ? (
              <>
                <View style={styles.sideColumnFull}>
                  <VisitPlanSummary
                    visitPlans={visitPlans}
                    userName={`${session.user.first_name} ${session.user.last_name}`.trim()}
                    weeklyPlans={weeklyPlans}
                    scopeLabel={session.permissions.can_view_all ? 'Global' : 'Own'}
                    selectedDate={selectedDate}
                    weekRangeLabel={weekRangeLabel}
                    onEditVisitPlan={openEditModal}
                    onJumpToPlanDate={handleSelectDate}
                    onCreateVisitPlan={() => openCreateModal(selectedDate)}
                    onLogout={handleLogout}
                  />
                </View>

                <View style={styles.mainColumnFull}>
                  <CalendarBoard
                    selectedDate={selectedDate}
                    visitPlans={visitPlans}
                    loading={loadingVisitPlans}
                    searchText={searchText}
                    onChangeSearchText={setSearchText}
                    activeStatusFilter={activeStatusFilter}
                    onChangeStatusFilter={setActiveStatusFilter}
                    onPreviousWindow={() => handleShiftScheduleWindow(-3)}
                    onNextWindow={() => handleShiftScheduleWindow(3)}
                    onSelectDate={handleSelectDate}
                    onCreateVisitPlan={() => openCreateModal(selectedDate)}
                    onRefresh={() => {
                      void loadDashboardData(session, {
                        search: deferredSearchText,
                        status: activeStatusFilter,
                      });
                    }}
                    onOpenVisitPlan={(id) => {
                      const visitPlan = visitPlans.find((item) => item.id === id);
                      if (visitPlan) {
                        handleSelectDate(visitPlan.date);
                      }
                    }}
                    onEditVisitPlan={openEditModal}
                    compactLayout={true}
                  />
                </View>
              </>
            ) : (
              <>
                <View style={styles.mainColumn}>
                  <CalendarBoard
                    selectedDate={selectedDate}
                    visitPlans={visitPlans}
                    loading={loadingVisitPlans}
                    searchText={searchText}
                    onChangeSearchText={setSearchText}
                    activeStatusFilter={activeStatusFilter}
                    onChangeStatusFilter={setActiveStatusFilter}
                    onPreviousWindow={() => handleShiftScheduleWindow(-3)}
                    onNextWindow={() => handleShiftScheduleWindow(3)}
                    onSelectDate={handleSelectDate}
                    onCreateVisitPlan={() => openCreateModal(selectedDate)}
                    onRefresh={() => {
                      void loadDashboardData(session, {
                        search: deferredSearchText,
                        status: activeStatusFilter,
                      });
                    }}
                    onOpenVisitPlan={(id) => {
                      const visitPlan = visitPlans.find((item) => item.id === id);
                      if (visitPlan) {
                        handleSelectDate(visitPlan.date);
                      }
                    }}
                    onEditVisitPlan={openEditModal}
                    compactLayout={false}
                  />
                </View>

                <View style={styles.sideColumn}>
                  <VisitPlanSummary
                    visitPlans={visitPlans}
                    userName={`${session.user.first_name} ${session.user.last_name}`.trim()}
                    weeklyPlans={weeklyPlans}
                    scopeLabel={session.permissions.can_view_all ? 'Global' : 'Own'}
                    selectedDate={selectedDate}
                    weekRangeLabel={weekRangeLabel}
                    onEditVisitPlan={openEditModal}
                    onJumpToPlanDate={handleSelectDate}
                    onCreateVisitPlan={() => openCreateModal(selectedDate)}
                    onLogout={handleLogout}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </ScrollView>

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
        allTeam={lookups.team}
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

  async function restorePersistedSession() {
    try {
      const rawSession = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
      if (!rawSession) {
        return;
      }

      const persistedSession = JSON.parse(rawSession) as SessionState;
      setSession(persistedSession);
      setLoginForm((current) => ({ ...current, baseUrl: persistedSession.baseUrl }));
    } catch {
      await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
    } finally {
      setRestoringSession(false);
    }
  }
}

async function persistSession(session: SessionState) {
  await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

async function clearPersistedSession() {
  await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
}

function shiftIsoDate(isoDate: string, offset: number) {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + offset);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}