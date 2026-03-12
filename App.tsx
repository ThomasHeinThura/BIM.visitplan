import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useDeferredValue, useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, useWindowDimensions, View } from 'react-native';
import { DEFAULT_API_BASE_URL } from './src/config';
import { Banner } from './src/components/Banner';
import { BottomNavigation, type AppPage } from './src/components/BottomNavigation';
import { CalendarBoard } from './src/components/CalendarBoard';
import { ClientWorkspaceScreen, type ClientWorkspaceTab } from './src/components/ClientWorkspaceScreen';
import { LoginScreen } from './src/components/LoginScreen';
import { ReviewScreen } from './src/components/ReviewScreen';
import { VisitPlanModal } from './src/components/VisitPlanModal';
import { VisitPlanSummary } from './src/components/VisitPlanSummary';
import { WorkspaceHeader } from './src/components/WorkspaceHeader';
import {
  ApiError,
  createVisitPlan,
  getClientWorkspace,
  getMe,
  listClientContacts,
  listClientFiles,
  listClientNotes,
  listClientOpportunities,
  listClients,
  listClientTimeline,
  listClientVisitPlans,
  listResource,
  listVisitPlans,
  login,
  updateVisitPlan,
} from './src/lib/api';
import { styles } from './src/styles';
import type {
  AuthUser,
  ClientContact,
  ClientFileRecord,
  ClientListItem,
  ClientNoteRecord,
  ClientOpportunity,
  ClientTimelineEvent,
  ClientWorkspaceSummary,
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
  const [activePage, setActivePage] = useState<AppPage>('visitplans');

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

  const [clientSearchText, setClientSearchText] = useState('');
  const deferredClientSearchText = useDeferredValue(clientSearchText);
  const [loadingClients, setLoadingClients] = useState(false);
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [clientWorkspaceTab, setClientWorkspaceTab] = useState<ClientWorkspaceTab>('timeline');
  const [loadingClientWorkspace, setLoadingClientWorkspace] = useState(false);
  const [clientSummary, setClientSummary] = useState<ClientWorkspaceSummary | null>(null);
  const [clientTimeline, setClientTimeline] = useState<ClientTimelineEvent[]>([]);
  const [clientContacts, setClientContacts] = useState<ClientContact[]>([]);
  const [clientOpportunities, setClientOpportunities] = useState<ClientOpportunity[]>([]);
  const [clientFiles, setClientFiles] = useState<ClientFileRecord[]>([]);
  const [clientNotes, setClientNotes] = useState<ClientNoteRecord[]>([]);
  const [clientVisitPlans, setClientVisitPlans] = useState<VisitPlan[]>([]);

  useEffect(() => {
    void restorePersistedSession();
  }, []);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadVisitPlanData(session, {
      search: deferredSearchText,
      status: activeStatusFilter,
    });
  }, [session, deferredSearchText, activeStatusFilter]);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadClientDirectory(session, deferredClientSearchText);
  }, [session, deferredClientSearchText]);

  useEffect(() => {
    if (!session || !selectedClientId) {
      return;
    }

    void loadClientWorkspaceData(session, selectedClientId);
  }, [session, selectedClientId]);

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
  const userName = session ? `${session.user.first_name} ${session.user.last_name}`.trim() : '';
  const scopeLabel = session?.permissions.can_view_all ? 'Global' : 'Own';

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
      setActivePage('visitplans');
      await persistSession(nextSession);
      setBanner({ tone: 'success', message: 'Signed in. Loading workspace...' });
    } catch (error) {
      setBanner({ tone: 'error', message: toFriendlyMessage(error) });
    } finally {
      setLoggingIn(false);
    }
  }

  async function loadVisitPlanData(
    currentSession: SessionState,
    filters: { search: string; status: number | null },
  ) {
    setLoadingVisitPlans(true);
    setLoadingLookups(true);

    try {
      const [visitPlanResponse, clientsResponse, years, quarters, team] = await Promise.all([
        listVisitPlans(currentSession.baseUrl, currentSession.token, {
          q: filters.search.trim() || undefined,
          status: filters.status ?? undefined,
          per_page: 250,
        }),
        listClients(currentSession.baseUrl, currentSession.token, {
          q: clientSearchText.trim() || undefined,
        }),
        listResource(currentSession.baseUrl, currentSession.token, 'financial-years', 50),
        listResource(currentSession.baseUrl, currentSession.token, 'financial-quarters', 30),
        listResource(currentSession.baseUrl, currentSession.token, 'team', 250),
      ]);

      setVisitPlans(visitPlanResponse.data);
      setVisitPlanMeta(visitPlanResponse.meta);
      setLookups({
        clients: clientsResponse.data.map((item) => ({
          id: item.id,
          label: item.name,
          subtitle: item.status || undefined,
        })),
        financialYears: years.map((item) => ({ id: Number(item.id ?? 0), label: String(item.name ?? 'Unknown') })),
        financialQuarters: quarters.map((item) => ({ id: Number(item.id ?? 0), label: String(item.name ?? 'Unknown') })),
        team: team.map((item) => ({
          id: Number(item.id ?? 0),
          label: `${String(item.first_name ?? '')} ${String(item.last_name ?? '')}`.trim() || String(item.email ?? 'Unknown team member'),
          subtitle: String((item.role as { role_name?: string } | undefined)?.role_name ?? item.email ?? ''),
        })),
      });
    } catch (error) {
      setBanner({ tone: 'error', message: toFriendlyMessage(error) });
    } finally {
      setLoadingVisitPlans(false);
      setLoadingLookups(false);
    }
  }

  async function loadClientDirectory(currentSession: SessionState, query: string) {
    setLoadingClients(true);

    try {
      const response = await listClients(currentSession.baseUrl, currentSession.token, {
        q: query.trim() || undefined,
      });

      setClients(response.data);
      setSelectedClientId((current) => {
        if (current && response.data.some((client) => client.id === current)) {
          return current;
        }

        return response.data[0]?.id ?? null;
      });

      if (response.data.length === 0) {
        setClientSummary(null);
        setClientTimeline([]);
        setClientContacts([]);
        setClientOpportunities([]);
        setClientFiles([]);
        setClientNotes([]);
        setClientVisitPlans([]);
      }
    } catch (error) {
      setBanner({ tone: 'error', message: toFriendlyMessage(error) });
    } finally {
      setLoadingClients(false);
    }
  }

  async function loadClientWorkspaceData(currentSession: SessionState, clientId: number) {
    setLoadingClientWorkspace(true);

    try {
      const [summary, timeline, contacts, opportunities, files, notes, visitPlansResponse] = await Promise.all([
        getClientWorkspace(currentSession.baseUrl, currentSession.token, clientId),
        listClientTimeline(currentSession.baseUrl, currentSession.token, clientId, { per_page: 15 }),
        listClientContacts(currentSession.baseUrl, currentSession.token, clientId, { per_page: 20 }),
        listClientOpportunities(currentSession.baseUrl, currentSession.token, clientId, { per_page: 20 }),
        listClientFiles(currentSession.baseUrl, currentSession.token, clientId, { per_page: 20 }),
        listClientNotes(currentSession.baseUrl, currentSession.token, clientId, { per_page: 20 }),
        listClientVisitPlans(currentSession.baseUrl, currentSession.token, clientId, { per_page: 50 }),
      ]);

      setClientSummary(summary.data);
      setClientTimeline(timeline.data);
      setClientContacts(contacts.data);
      setClientOpportunities(opportunities.data);
      setClientFiles(files.data);
      setClientNotes(notes.data);
      setClientVisitPlans(visitPlansResponse.data);
    } catch (error) {
      setBanner({ tone: 'error', message: toFriendlyMessage(error) });
    } finally {
      setLoadingClientWorkspace(false);
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

      await loadVisitPlanData(session, {
        search: deferredSearchText,
        status: activeStatusFilter,
      });

      if (selectedClientId && draft.client_id === selectedClientId) {
        await loadClientWorkspaceData(session, selectedClientId);
      }
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
    setClients([]);
    setSelectedClientId(null);
    setClientSummary(null);
    setClientTimeline([]);
    setClientContacts([]);
    setClientOpportunities([]);
    setClientFiles([]);
    setClientNotes([]);
    setClientVisitPlans([]);
    setActivePage('visitplans');
    setBanner({ tone: 'info', message: 'Signed out.' });
    void clearPersistedSession();
  }

  function handleSelectDate(date: string) {
    setSelectedDate(date);
  }

  function handleShiftScheduleWindow(offset: number) {
    setSelectedDate(shiftIsoDate(selectedDate, offset));
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
          <WorkspaceHeader userName={userName} scopeLabel={scopeLabel} onLogout={handleLogout} />
          {banner ? <Banner banner={banner} /> : null}

          {activePage === 'visitplans' ? (
            <View style={styles.pageStack}>
              <View style={styles.sideColumnFull}>
                <VisitPlanSummary
                  userName={userName}
                  weeklyPlans={weeklyPlans}
                  scopeLabel={scopeLabel}
                  weekRangeLabel={weekRangeLabel}
                  onCreateVisitPlan={() => openCreateModal(selectedDate)}
                  showSessionBanner={false}
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
                    void loadVisitPlanData(session, {
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
                  compactLayout={isCompactLayout}
                />
              </View>
            </View>
          ) : null}

          {activePage === 'clients' ? (
            <ClientWorkspaceScreen
              clients={clients}
              loadingClients={loadingClients}
              loadingWorkspace={loadingClientWorkspace}
              searchText={clientSearchText}
              onChangeSearchText={setClientSearchText}
              selectedClientId={selectedClientId}
              onSelectClient={(clientId) => {
                setClientWorkspaceTab('timeline');
                setSelectedClientId(clientId);
              }}
              summary={clientSummary}
              activeTab={clientWorkspaceTab}
              onChangeTab={setClientWorkspaceTab}
              timeline={clientTimeline}
              contacts={clientContacts}
              opportunities={clientOpportunities}
              files={clientFiles}
              notes={clientNotes}
              visitPlans={clientVisitPlans}
            />
          ) : null}

          {activePage === 'review' ? (
            <ReviewScreen
              visitPlans={visitPlans}
              onEditVisitPlan={openEditModal}
              onJumpToPlanDate={handleSelectDate}
            />
          ) : null}
        </View>
      </ScrollView>

      <BottomNavigation activePage={activePage} onChangePage={setActivePage} />

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