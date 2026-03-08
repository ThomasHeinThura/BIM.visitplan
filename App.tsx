import { StatusBar } from 'expo-status-bar';
import React, { useDeferredValue, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
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
import { DEFAULT_API_BASE_URL } from './src/config';
import type {
  AuthUser,
  LookupItem,
  VisitPlan,
  VisitPlanDraft,
  VisitPlanListResponse,
  VisitPlanPermissions,
} from './src/types';

const STATUS_OPTIONS = [
  { id: 0, label: 'Not Started' },
  { id: 1, label: 'In Progress' },
  { id: 2, label: 'Completed' },
  { id: 3, label: 'Cancelled' },
];

const LOCATION_OPTIONS = [
  { id: 1, label: 'Online' },
  { id: 2, label: 'In-person' },
  { id: 3, label: 'Others' },
];

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
};

type LoginFormState = {
  baseUrl: string;
  email: string;
  password: string;
};

const createInitialDraft = (): VisitPlanDraft => ({
  title: '',
  client_id: null,
  financial_year_id: null,
  financial_quarter_id: null,
  date: formatDateForPayload(new Date()),
  start_time: '09:00',
  end_time: '10:00',
  location: 1,
  location_others: '',
  status: 0,
  agenda: '',
  description: '',
  url: '',
});

export default function App() {
  const { width } = useWindowDimensions();
  const isWideLayout = width >= 1100;
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
  const [lookups, setLookups] = useState<LookupsState>({
    clients: [],
    financialYears: [],
    financialQuarters: [],
  });
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [selectedVisitPlan, setSelectedVisitPlan] = useState<VisitPlan | null>(null);
  const [loadingSelectedVisitPlan, setLoadingSelectedVisitPlan] = useState(false);
  const [searchText, setSearchText] = useState('');
  const deferredSearchText = useDeferredValue(searchText);
  const [activeStatusFilter, setActiveStatusFilter] = useState<number | null>(null);
  const [draft, setDraft] = useState<VisitPlanDraft>(createInitialDraft());
  const [editingVisitPlanId, setEditingVisitPlanId] = useState<number | null>(null);
  const [submittingDraft, setSubmittingDraft] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [meetingResultDraft, setMeetingResultDraft] = useState('');
  const [savingMeetingResult, setSavingMeetingResult] = useState(false);
  const [lookupQueries, setLookupQueries] = useState({
    client: '',
    financialYear: '',
    financialQuarter: '',
  });

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

  const visibleClients = filterLookupItems(lookups.clients, lookupQueries.client, 12);
  const visibleYears = filterLookupItems(lookups.financialYears, lookupQueries.financialYear);
  const visibleQuarters = filterLookupItems(lookups.financialQuarters, lookupQueries.financialQuarter);
  const canCreateVisitPlans = session?.permissions.can_create ?? false;
  const isEditingVisitPlan = editingVisitPlanId !== null;
  const selectedClientLabel = findLookupLabel(lookups.clients, draft.client_id);
  const selectedFinancialYearLabel = findLookupLabel(lookups.financialYears, draft.financial_year_id);
  const selectedFinancialQuarterLabel = findLookupLabel(lookups.financialQuarters, draft.financial_quarter_id);

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
      const [visitPlanResponse, clients, years, quarters] = await Promise.all([
        listVisitPlans(currentSession.baseUrl, currentSession.token, {
          q: filters.search.trim() || undefined,
          status: filters.status ?? undefined,
          per_page: 50,
        }),
        listResource(currentSession.baseUrl, currentSession.token, 'clients', 100),
        listResource(currentSession.baseUrl, currentSession.token, 'financial-years', 30),
        listResource(currentSession.baseUrl, currentSession.token, 'financial-quarters', 10),
      ]);

      setVisitPlans(visitPlanResponse.data);
      setVisitPlanMeta(visitPlanResponse.meta);
      setLookups({
        clients: clients.map(mapLookupLabel),
        financialYears: years.map(mapLookupLabel),
        financialQuarters: quarters.map(mapLookupLabel),
      });

      if (selectedVisitPlan) {
        const refreshed = visitPlanResponse.data.find((item) => item.id === selectedVisitPlan.id);
        if (refreshed) {
          setSelectedVisitPlan(refreshed);
        }
      }

      if (visitPlanResponse.data.length === 0) {
        setSelectedVisitPlan(null);
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
    } catch (error) {
      setBanner({ tone: 'error', message: toFriendlyMessage(error) });
    } finally {
      setLoadingSelectedVisitPlan(false);
    }
  }

  async function handleCreateVisitPlan() {
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
        url: draft.url?.trim() || undefined,
        description: draft.description?.trim() || undefined,
        location_others: draft.location === 3 ? draft.location_others?.trim() || undefined : undefined,
      };
      const response = editingVisitPlanId
        ? await updateVisitPlan(session.baseUrl, session.token, editingVisitPlanId, payload)
        : await createVisitPlan(session.baseUrl, session.token, payload);

      setDraft(createInitialDraft());
      setEditingVisitPlanId(null);
      setLookupQueries({ client: '', financialYear: '', financialQuarter: '' });
      setSelectedVisitPlan(response.data);
      setMeetingResultDraft(response.data.description || '');
      setBanner({
        tone: 'success',
        message: editingVisitPlanId
          ? 'Visit plan updated successfully.'
          : 'Visit plan created successfully.',
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

  function handleStartEditVisitPlan() {
    if (!selectedVisitPlan) {
      return;
    }

    setEditingVisitPlanId(selectedVisitPlan.id);
    setDraft(buildDraftFromVisitPlan(selectedVisitPlan));
    setLookupQueries({
      client: selectedVisitPlan.client_name || '',
      financialYear: selectedVisitPlan.financial_year_name || '',
      financialQuarter: selectedVisitPlan.financial_quarter_name || '',
    });
    setBanner({ tone: 'info', message: `Editing visit plan #${selectedVisitPlan.id}.` });
  }

  function handleCancelEdit() {
    setEditingVisitPlanId(null);
    setDraft(createInitialDraft());
    setLookupQueries({ client: '', financialYear: '', financialQuarter: '' });
    setBanner({ tone: 'info', message: 'Edit mode cancelled.' });
  }

  async function handleSaveMeetingResult() {
    if (!session || !selectedVisitPlan) {
      return;
    }

    setSavingMeetingResult(true);

    try {
      const response = await updateVisitPlan(
        session.baseUrl,
        session.token,
        selectedVisitPlan.id,
        {
          ...buildDraftFromVisitPlan(selectedVisitPlan),
          description: meetingResultDraft,
        },
      );

      setSelectedVisitPlan(response.data);
      setVisitPlans((current) =>
        current.map((item) => (item.id === response.data.id ? response.data : item)),
      );
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
      const response = await updateVisitPlanStatus(
        session.baseUrl,
        session.token,
        selectedVisitPlan.id,
        nextStatus,
      );

      setSelectedVisitPlan(response.data);
      setVisitPlans((current) =>
        current.map((item) => (item.id === response.data.id ? response.data : item)),
      );
      setBanner({ tone: 'success', message: 'Visit plan status updated successfully.' });
    } catch (error) {
      const apiError = error instanceof ApiError ? error : null;
      if (apiError?.status === 404) {
        setBanner({
          tone: 'error',
          message:
            'This server does not expose the status update endpoint yet. Deploy the latest BIM.GRGCRM API changes first.',
        });
      } else {
        setBanner({ tone: 'error', message: toFriendlyMessage(error) });
      }
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
    setEditingVisitPlanId(null);
    setMeetingResultDraft('');
    setBanner({ tone: 'info', message: 'Signed out.' });
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.screenBackdrop} pointerEvents="none">
          <View style={[styles.backgroundOrb, styles.backgroundOrbTop]} />
          <View style={[styles.backgroundOrb, styles.backgroundOrbMiddle]} />
          <View style={[styles.backgroundOrb, styles.backgroundOrbBottom]} />
        </View>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.loginShell}
        >
          <View style={styles.loginPanel}>
            <View style={styles.loginCard}>
              <Text style={styles.eyebrow}>BIM CRM</Text>
              <Text style={styles.loginTitle}>Visitplan Workspace</Text>
              <Text style={styles.loginSubtitle}>
                One Expo codebase for iOS, Android, and web, built on the CRM bearer-token API.
              </Text>

              <LabeledInput
                label="API Base URL"
                value={loginForm.baseUrl}
                onChangeText={(value) => setLoginForm((current) => ({ ...current, baseUrl: value }))}
                placeholder="https://uat-crm.bimats.com:10443"
                autoCapitalize="none"
              />
              <LabeledInput
                label="Email"
                value={loginForm.email}
                onChangeText={(value) => setLoginForm((current) => ({ ...current, email: value }))}
                placeholder="user@company.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <LabeledInput
                label="Password"
                value={loginForm.password}
                onChangeText={(value) => setLoginForm((current) => ({ ...current, password: value }))}
                placeholder="Enter CRM password"
                secureTextEntry
              />

              {banner ? <Banner banner={banner} /> : null}

              <Pressable
                disabled={loggingIn}
                onPress={() => {
                  void handleLogin();
                }}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && !loggingIn ? styles.primaryButtonPressed : null,
                  loggingIn ? styles.buttonDisabled : null,
                ]}
              >
                {loggingIn ? (
                  <ActivityIndicator color="#F5F7FB" />
                ) : (
                  <Text style={styles.primaryButtonText}>Sign In To Visitplan</Text>
                )}
              </Pressable>
            </View>

            <View style={styles.loginShowcaseCard}>
              <Text style={styles.showcaseEyebrow}>Workspace Preview</Text>
              <Text style={styles.showcaseTitle}>Fast planning, cleaner follow-up, one modern dashboard.</Text>
              <View style={styles.showcaseChartCard}>
                <View style={styles.showcaseLine} />
                <View style={styles.showcaseLineShort} />
                <View style={styles.showcaseLineDot} />
              </View>
              <View style={styles.showcaseMetricRow}>
                <MetricCard label="Modes" value="Web / iOS / Android" />
                <MetricCard label="Flow" value="Create / Update / Result" />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
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
          <View>
            <Text style={styles.eyebrow}>BIM Visitplan</Text>
            <Text style={styles.pageTitle}>AM and Presale Visit Plans</Text>
            <Text style={styles.pageSubtitle}>
              Connected to {session.baseUrl} with {visitPlanMeta?.total ?? 0} visible visit plans.
            </Text>
          </View>
          <View style={styles.heroMeta}>
            <Text style={styles.heroMetaTitle}>{session.user.first_name} {session.user.last_name}</Text>
            <Text style={styles.heroMetaText}>{session.user.email}</Text>
            <Text style={styles.heroMetaText}>
              Scope: {session.permissions.can_view_all ? 'Global' : 'Own'} | Create: {session.permissions.can_create ? 'Yes' : 'No'}
            </Text>
            <Pressable onPress={handleLogout} style={styles.ghostButton}>
              <Text style={styles.ghostButtonText}>Logout</Text>
            </Pressable>
          </View>
        </View>

        {banner ? <Banner banner={banner} /> : null}

        <View style={styles.metricsRow}>
          <MetricCard label="Visible plans" value={String(visitPlanMeta?.total ?? 0)} />
          <MetricCard label="Scope" value={session.permissions.can_view_all ? 'Global' : 'Own'} />
          <MetricCard label="Create access" value={session.permissions.can_create ? 'Enabled' : 'View only'} />
        </View>

        <View style={[styles.contentRow, !isWideLayout ? styles.contentColumn : null]}>
          <View style={[styles.mainColumn, !isWideLayout ? styles.fullWidthColumn : null]}>
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={styles.sectionTitle}>Visit Plan Board</Text>
                  <Text style={styles.sectionSubtitle}>
                    Search, filter, inspect, and refresh what the current account can see.
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    void loadDashboardData(session, {
                      search: deferredSearchText,
                      status: activeStatusFilter,
                    });
                  }}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Refresh</Text>
                </Pressable>
              </View>

              <View style={styles.toolbarRow}>
                <TextInput
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholder="Search title, agenda, creator, or client"
                  placeholderTextColor="#7D7A73"
                  style={[styles.input, styles.searchInput]}
                />
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterChipRow}
              >
                <StatusChip
                  active={activeStatusFilter === null}
                  label="All"
                  onPress={() => setActiveStatusFilter(null)}
                />
                {STATUS_OPTIONS.map((status) => (
                  <StatusChip
                    key={status.id}
                    active={activeStatusFilter === status.id}
                    label={status.label}
                    onPress={() => setActiveStatusFilter(status.id)}
                  />
                ))}
              </ScrollView>

              {loadingVisitPlans ? (
                <View style={styles.loadingState}>
                  <ActivityIndicator color="#0E5A63" />
                  <Text style={styles.loadingText}>Loading visit plans...</Text>
                </View>
              ) : visitPlans.length === 0 ? (
                <EmptyState
                  title="No visit plans found"
                  description="Try another search or create a new visit plan from the panel on the right."
                />
              ) : (
                <View style={styles.cardStack}>
                  {visitPlans.map((visitPlan) => (
                    <Pressable
                      key={visitPlan.id}
                      onPress={() => {
                        void handleSelectVisitPlan(visitPlan.id);
                      }}
                      style={({ pressed }) => [
                        styles.visitPlanCard,
                        selectedVisitPlan?.id === visitPlan.id ? styles.visitPlanCardActive : null,
                        pressed ? styles.visitPlanCardPressed : null,
                      ]}
                    >
                      <View style={styles.visitPlanCardHeader}>
                        <Text style={styles.visitPlanCardTitle}>{visitPlan.title}</Text>
                        <Text style={styles.visitPlanCardBadge}>{visitPlan.status}</Text>
                      </View>
                      <Text style={styles.visitPlanCardMeta}>{visitPlan.client_name || 'No client'}</Text>
                      <Text style={styles.visitPlanCardMeta}>
                        {visitPlan.date} | {visitPlan.start_time} - {visitPlan.end_time}
                      </Text>
                      <Text style={styles.visitPlanCardMeta}>
                        {visitPlan.creator?.name || 'Unknown creator'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>

          <View style={[styles.sideColumn, !isWideLayout ? styles.fullWidthColumn : null]}>
            <ScrollView contentContainerStyle={styles.sideColumnStack}>
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>{isEditingVisitPlan ? 'Edit Visit Plan' : 'Create Visit Plan'}</Text>
                <Text style={styles.sectionSubtitle}>
                  This form targets the CRM API payload shape for both create and full update flows.
                </Text>

                {!canCreateVisitPlans && !isEditingVisitPlan ? (
                  <EmptyState
                    title="Create access is disabled"
                    description="This signed-in role does not currently expose create permission for visit plans."
                  />
                ) : (
                  <View style={styles.formStack}>
                    <View style={styles.formHeroStrip}>
                      <Text style={styles.formHeroTitle}>
                        {isEditingVisitPlan ? 'Editing selected plan' : 'Plan the meeting'}
                      </Text>
                      <Text style={styles.formHeroText}>
                        Search lookups, set time and location, then save. Use the detail panel to update meeting results later.
                      </Text>
                    </View>

                    <LabeledInput
                      label="Title"
                      value={draft.title}
                      onChangeText={(value) => setDraft((current) => ({ ...current, title: value }))}
                      placeholder="Customer renewal review"
                    />

                    <LookupChooser
                      label="Client"
                      query={lookupQueries.client}
                      selectedLabel={selectedClientLabel}
                      onChangeQuery={(value) => {
                        setLookupQueries((current) => ({ ...current, client: value }));
                        setDraft((current) => ({ ...current, client_id: null }));
                      }}
                      options={visibleClients}
                      selectedId={draft.client_id}
                      onSelect={(id, label) => {
                        setDraft((current) => ({ ...current, client_id: id }));
                        setLookupQueries((current) => ({ ...current, client: label }));
                      }}
                      onClear={() => {
                        setDraft((current) => ({ ...current, client_id: null }));
                        setLookupQueries((current) => ({ ...current, client: '' }));
                      }}
                      loading={loadingLookups}
                      helperText="Type to filter clients, then choose from the scroll list."
                    />

                    <LookupChooser
                      label="Financial Year"
                      query={lookupQueries.financialYear}
                      selectedLabel={selectedFinancialYearLabel}
                      onChangeQuery={(value) => {
                        setLookupQueries((current) => ({ ...current, financialYear: value }));
                        setDraft((current) => ({ ...current, financial_year_id: null }));
                      }}
                      options={visibleYears}
                      selectedId={draft.financial_year_id}
                      onSelect={(id, label) => {
                        setDraft((current) => ({ ...current, financial_year_id: id }));
                        setLookupQueries((current) => ({ ...current, financialYear: label }));
                      }}
                      onClear={() => {
                        setDraft((current) => ({ ...current, financial_year_id: null }));
                        setLookupQueries((current) => ({ ...current, financialYear: '' }));
                      }}
                      loading={loadingLookups}
                      helperText="Search and select the year from the dropdown box."
                    />

                    <LookupChooser
                      label="Financial Quarter"
                      query={lookupQueries.financialQuarter}
                      selectedLabel={selectedFinancialQuarterLabel}
                      onChangeQuery={(value) => {
                        setLookupQueries((current) => ({ ...current, financialQuarter: value }));
                        setDraft((current) => ({ ...current, financial_quarter_id: null }));
                      }}
                      options={visibleQuarters}
                      selectedId={draft.financial_quarter_id}
                      onSelect={(id, label) => {
                        setDraft((current) => ({ ...current, financial_quarter_id: id }));
                        setLookupQueries((current) => ({ ...current, financialQuarter: label }));
                      }}
                      onClear={() => {
                        setDraft((current) => ({ ...current, financial_quarter_id: null }));
                        setLookupQueries((current) => ({ ...current, financialQuarter: '' }));
                      }}
                      loading={loadingLookups}
                      helperText="Type any part of the quarter name and choose it below."
                    />

                    <View style={styles.rowFields}>
                      <LabeledInput
                        label="Date"
                        value={draft.date}
                        onChangeText={(value) => setDraft((current) => ({ ...current, date: value }))}
                        placeholder="03-08-2026"
                        containerStyle={styles.halfField}
                      />
                      <LabeledInput
                        label="Status"
                        value={String(draft.status)}
                        onChangeText={() => undefined}
                        editable={false}
                        containerStyle={styles.halfField}
                      />
                    </View>

                    <View style={styles.rowFields}>
                      <LabeledInput
                        label="Start Time"
                        value={draft.start_time}
                        onChangeText={(value) =>
                          setDraft((current) => ({ ...current, start_time: value }))
                        }
                        placeholder="09:00"
                        containerStyle={styles.halfField}
                      />
                      <LabeledInput
                        label="End Time"
                        value={draft.end_time}
                        onChangeText={(value) => setDraft((current) => ({ ...current, end_time: value }))}
                        placeholder="10:00"
                        containerStyle={styles.halfField}
                      />
                    </View>

                    <SegmentedChoices
                      label="Location"
                      options={LOCATION_OPTIONS}
                      selectedId={draft.location}
                      onSelect={(id) => setDraft((current) => ({ ...current, location: id }))}
                    />

                    {draft.location === 3 ? (
                      <LabeledInput
                        label="Other Location"
                        value={draft.location_others || ''}
                        onChangeText={(value) =>
                          setDraft((current) => ({ ...current, location_others: value }))
                        }
                        placeholder="Partner office / customer site"
                      />
                    ) : null}

                    <SegmentedChoices
                      label="Initial Status"
                      options={STATUS_OPTIONS}
                      selectedId={draft.status}
                      onSelect={(id) => setDraft((current) => ({ ...current, status: id }))}
                    />

                    <LabeledInput
                      label="Agenda"
                      value={draft.agenda}
                      onChangeText={(value) => setDraft((current) => ({ ...current, agenda: value }))}
                      placeholder="Discuss renewal scope, blockers, and next action"
                      multiline
                    />

                    <LabeledInput
                      label="Description"
                      value={draft.description || ''}
                      onChangeText={(value) =>
                        setDraft((current) => ({ ...current, description: value }))
                      }
                      placeholder="Optional description or expected meeting result"
                      multiline
                    />

                    <LabeledInput
                      label="Meeting URL"
                      value={draft.url || ''}
                      onChangeText={(value) => setDraft((current) => ({ ...current, url: value }))}
                      placeholder="https://meet.example.com/room"
                      autoCapitalize="none"
                    />

                    <Pressable
                      disabled={submittingDraft}
                      onPress={() => {
                        void handleCreateVisitPlan();
                      }}
                      style={({ pressed }) => [
                        styles.primaryButton,
                        pressed && !submittingDraft ? styles.primaryButtonPressed : null,
                        submittingDraft ? styles.buttonDisabled : null,
                      ]}
                    >
                      {submittingDraft ? (
                        <ActivityIndicator color="#F9F6EE" />
                      ) : (
                        <Text style={styles.primaryButtonText}>
                          {isEditingVisitPlan ? 'Save Visit Plan Changes' : 'Create Visit Plan'}
                        </Text>
                      )}
                    </Pressable>

                    {isEditingVisitPlan ? (
                      <Pressable onPress={handleCancelEdit} style={styles.secondaryButtonMuted}>
                        <Text style={styles.secondaryButtonText}>Cancel Edit</Text>
                      </Pressable>
                    ) : null}
                  </View>
                )}
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Visit Plan Detail</Text>
                <Text style={styles.sectionSubtitle}>
                  Select any visit plan from the board to inspect or change its status.
                </Text>

                {loadingSelectedVisitPlan ? (
                  <View style={styles.loadingState}>
                    <ActivityIndicator color="#0E5A63" />
                    <Text style={styles.loadingText}>Loading visit plan detail...</Text>
                  </View>
                ) : !selectedVisitPlan ? (
                  <EmptyState
                    title="Nothing selected"
                    description="Choose a visit plan on the left to see its full detail and status controls."
                  />
                ) : (
                  <View style={styles.detailStack}>
                    <Text style={styles.detailTitle}>{selectedVisitPlan.title}</Text>
                    <Text style={styles.detailMeta}>{selectedVisitPlan.client_name || 'No client assigned'}</Text>
                    <Text style={styles.detailMeta}>
                      {selectedVisitPlan.date} | {selectedVisitPlan.start_time} - {selectedVisitPlan.end_time}
                    </Text>
                    <Text style={styles.detailMeta}>
                      Location: {selectedVisitPlan.location}
                      {selectedVisitPlan.location_others ? ` (${selectedVisitPlan.location_others})` : ''}
                    </Text>
                    <Text style={styles.detailMeta}>
                      Creator: {selectedVisitPlan.creator?.name || 'Unknown'}
                    </Text>
                    <View style={styles.detailSectionCard}>
                      <Text style={styles.detailSectionTitle}>Agenda</Text>
                      <Text style={styles.detailBody}>{selectedVisitPlan.agenda}</Text>
                    </View>

                    <View style={styles.detailSectionCard}>
                      <Text style={styles.detailSectionTitle}>Description</Text>
                      <Text style={styles.detailBodyMuted}>
                        {selectedVisitPlan.description || 'No description added yet.'}
                      </Text>
                    </View>

                    {selectedVisitPlan.url ? (
                      <View style={styles.detailSectionCard}>
                        <Text style={styles.detailSectionTitle}>Meeting URL</Text>
                        <Text style={styles.detailBodyMuted}>{selectedVisitPlan.url}</Text>
                      </View>
                    ) : null}

                    {selectedVisitPlan.permissions?.can_edit ? (
                      <Pressable onPress={handleStartEditVisitPlan} style={styles.secondaryButtonMuted}>
                        <Text style={styles.secondaryButtonText}>Load Into Edit Form</Text>
                      </Pressable>
                    ) : null}

                    <View style={styles.detailSectionCard}>
                      <Text style={styles.detailSectionTitle}>Meeting Result Update</Text>
                      <Text style={styles.sectionSubtitle}>
                        Update what happened in the meeting, decisions made, and next steps.
                      </Text>
                      <TextInput
                        value={meetingResultDraft}
                        onChangeText={setMeetingResultDraft}
                        editable={Boolean(selectedVisitPlan.permissions?.can_edit) && !savingMeetingResult}
                        multiline
                        placeholder="Add the meeting result here"
                        placeholderTextColor="#94A3B8"
                        style={[styles.input, styles.multilineInput, styles.meetingResultInput]}
                      />
                      {selectedVisitPlan.permissions?.can_edit ? (
                        <Pressable
                          onPress={() => {
                            void handleSaveMeetingResult();
                          }}
                          disabled={savingMeetingResult}
                          style={({ pressed }) => [
                            styles.primaryButton,
                            styles.inlineActionButton,
                            pressed && !savingMeetingResult ? styles.primaryButtonPressed : null,
                            savingMeetingResult ? styles.buttonDisabled : null,
                          ]}
                        >
                          {savingMeetingResult ? (
                            <ActivityIndicator color="#F5F7FB" />
                          ) : (
                            <Text style={styles.primaryButtonText}>Save Meeting Result</Text>
                          )}
                        </Pressable>
                      ) : null}
                    </View>

                    <View style={styles.statusUpdateBlock}>
                      <Text style={styles.statusUpdateLabel}>Update Status</Text>
                      <View style={styles.statusUpdateRow}>
                        {STATUS_OPTIONS.map((status) => (
                          <Pressable
                            key={status.id}
                            onPress={() => {
                              void handleStatusUpdate(status.id);
                            }}
                            disabled={
                              updatingStatus !== null || !selectedVisitPlan.permissions?.can_update_status
                            }
                            style={({ pressed }) => [
                              styles.statusAction,
                              selectedVisitPlan.status_id === status.id ? styles.statusActionActive : null,
                              pressed ? styles.statusActionPressed : null,
                              updatingStatus !== null || !selectedVisitPlan.permissions?.can_update_status
                                ? styles.buttonDisabled
                                : null,
                            ]}
                          >
                            <Text
                              style={
                                selectedVisitPlan.status_id === status.id
                                  ? styles.statusActionTextActive
                                  : styles.statusActionText
                              }
                            >
                              {updatingStatus === status.id ? 'Updating...' : status.label}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                      {!selectedVisitPlan.permissions?.can_update_status ? (
                        <Text style={styles.sectionSubtitle}>
                          This account cannot change the status of the selected visit plan.
                        </Text>
                      ) : null}
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Banner({ banner }: { banner: BannerState }) {
  return (
    <View
      style={[
        styles.banner,
        banner.tone === 'error'
          ? styles.bannerError
          : banner.tone === 'success'
            ? styles.bannerSuccess
            : styles.bannerInfo,
      ]}
    >
      <Text style={styles.bannerText}>{banner.message}</Text>
    </View>
  );
}

function LabeledInput({
  label,
  containerStyle,
  ...props
}: React.ComponentProps<typeof TextInput> & { label: string; containerStyle?: object }) {
  return (
    <View style={[styles.fieldBlock, containerStyle]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor="#7D7A73"
        style={[styles.input, props.multiline ? styles.multilineInput : null]}
        {...props}
      />
    </View>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function SegmentedChoices({
  label,
  options,
  selectedId,
  onSelect,
}: {
  label: string;
  options: Array<{ id: number; label: string }>;
  selectedId: number;
  onSelect: (id: number) => void;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.segmentedRow}>
        {options.map((option) => (
          <Pressable
            key={option.id}
            onPress={() => onSelect(option.id)}
            style={({ pressed }) => [
              styles.segmentOption,
              selectedId === option.id ? styles.segmentOptionActive : null,
              pressed ? styles.segmentOptionPressed : null,
            ]}
          >
            <Text style={selectedId === option.id ? styles.segmentOptionTextActive : styles.segmentOptionText}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function LookupChooser({
  label,
  query,
  selectedLabel,
  onChangeQuery,
  options,
  selectedId,
  onSelect,
  onClear,
  loading,
  helperText,
}: {
  label: string;
  query: string;
  selectedLabel?: string | null;
  onChangeQuery: (value: string) => void;
  options: LookupItem[];
  selectedId: number | null;
  onSelect: (id: number, label: string) => void;
  onClear: () => void;
  loading: boolean;
  helperText?: string;
}) {
  return (
    <View style={styles.fieldBlock}>
      <View style={styles.lookupTitleRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.lookupMetaText}>{selectedId ? 'Selected' : `${options.length} options`}</Text>
      </View>
      <TextInput
        value={query}
        onChangeText={onChangeQuery}
        placeholder={`Search ${label.toLowerCase()}`}
        placeholderTextColor="#7D7A73"
        style={[styles.input, styles.lookupInput]}
      />
      {selectedLabel ? (
        <View style={styles.lookupSelectionRow}>
          <Text style={styles.lookupSelectionLabel}>Chosen: {selectedLabel}</Text>
          <Pressable onPress={onClear} style={styles.clearSelectionButton}>
            <Text style={styles.clearSelectionText}>Clear</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.lookupPanel}>
        <ScrollView nestedScrollEnabled style={styles.lookupScroll}>
          {loading ? (
            <Text style={styles.lookupHint}>Loading options...</Text>
          ) : options.length === 0 ? (
            <Text style={styles.lookupHint}>No matching options.</Text>
          ) : (
            options.map((option) => (
              <Pressable
                key={option.id}
                onPress={() => onSelect(option.id, option.label)}
                style={({ pressed }) => [
                  styles.lookupOption,
                  selectedId === option.id ? styles.lookupOptionActive : null,
                  pressed ? styles.lookupOptionPressed : null,
                ]}
              >
                <Text style={styles.lookupOptionText}>{option.label}</Text>
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>
      {helperText ? <Text style={styles.fieldHelper}>{helperText}</Text> : null}
    </View>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>{title}</Text>
      <Text style={styles.emptyStateDescription}>{description}</Text>
    </View>
  );
}

function StatusChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterChip,
        active ? styles.filterChipActive : null,
        pressed ? styles.filterChipPressed : null,
      ]}
    >
      <Text style={active ? styles.filterChipTextActive : styles.filterChipText}>{label}</Text>
    </Pressable>
  );
}

function derivePermissions(
  user: AuthUser,
  permissions?: VisitPlanPermissions | null,
): VisitPlanPermissions {
  if (permissions) {
    return permissions;
  }

  const isTeam = user.type === 'team';

  return {
    level: isTeam ? 2 : 0,
    scope: 'own',
    can_view: isTeam,
    can_create: isTeam,
    can_edit: isTeam,
    can_delete: false,
    can_view_all: false,
  };
}

function filterLookupItems(items: LookupItem[], query: string, limit?: number) {
  const keyword = query.trim().toLowerCase();
  const filtered = keyword
    ? items.filter((item) => item.label.toLowerCase().includes(keyword))
    : items;

  return typeof limit === 'number' ? filtered.slice(0, limit) : filtered;
}

function findLookupLabel(items: LookupItem[], selectedId: number | null) {
  if (!selectedId) {
    return null;
  }

  return items.find((item) => item.id === selectedId)?.label || null;
}

function mapLookupLabel(item: Record<string, unknown>): LookupItem {
  const fallbackName = `${String(item.first_name ?? '')} ${String(item.last_name ?? '')}`.trim();
  const id = Number(item.id ?? item.client_id ?? 0);
  const preferredLabel = item.client_company_name ?? item.name ?? (fallbackName || id);
  const label = String(preferredLabel);

  return { id, label };
}

function validateDraft(draft: VisitPlanDraft): string | null {
  if (!draft.title.trim()) {
    return 'Title is required.';
  }
  if (!draft.client_id) {
    return 'Client selection is required.';
  }
  if (!draft.financial_year_id) {
    return 'Financial year selection is required.';
  }
  if (!draft.financial_quarter_id) {
    return 'Financial quarter selection is required.';
  }
  if (!draft.date.trim()) {
    return 'Date is required in MM-DD-YYYY format.';
  }
  if (!draft.start_time.trim() || !draft.end_time.trim()) {
    return 'Start and end times are required in HH:mm format.';
  }
  if (!draft.agenda.trim()) {
    return 'Agenda is required.';
  }
  if (draft.location === 3 && !draft.location_others?.trim()) {
    return 'Other location is required when the location is Others.';
  }

  return null;
}

function buildDraftFromVisitPlan(visitPlan: VisitPlan): VisitPlanDraft {
  return {
    title: visitPlan.title,
    client_id: visitPlan.client_id,
    financial_year_id: visitPlan.financial_year_id,
    financial_quarter_id: visitPlan.financial_quarter_id,
    date: visitPlan.date,
    start_time: visitPlan.start_time,
    end_time: visitPlan.end_time,
    location: visitPlan.location_id,
    location_others: visitPlan.location_others || '',
    status: visitPlan.status_id,
    agenda: visitPlan.agenda,
    description: visitPlan.description || '',
    url: visitPlan.url || '',
  };
}

function formatDateForPayload(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}-${day}-${year}`;
}

function toFriendlyMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'The request could not be completed.';
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E5EDF4',
  },
  screenBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundOrb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.55,
  },
  backgroundOrbTop: {
    top: -90,
    right: -60,
    width: 260,
    height: 260,
    backgroundColor: '#C9DBF8',
  },
  backgroundOrbMiddle: {
    top: 220,
    left: -80,
    width: 220,
    height: 220,
    backgroundColor: '#D9F0F2',
  },
  backgroundOrbBottom: {
    bottom: -100,
    right: 60,
    width: 280,
    height: 280,
    backgroundColor: '#D8D9FF',
  },
  loginShell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loginPanel: {
    width: '100%',
    maxWidth: 1180,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
  },
  loginCard: {
    width: '100%',
    maxWidth: 560,
    flex: 1,
    borderRadius: 34,
    padding: 30,
    backgroundColor: 'rgba(248, 251, 255, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.75)',
    shadowColor: '#6B7A90',
    shadowOpacity: 0.18,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  loginShowcaseCard: {
    flex: 1,
    minWidth: 320,
    borderRadius: 34,
    padding: 28,
    backgroundColor: 'rgba(13, 22, 37, 0.86)',
    borderWidth: 1,
    borderColor: 'rgba(110, 144, 255, 0.26)',
    shadowColor: '#1B2437',
    shadowOpacity: 0.26,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 18 },
    elevation: 12,
  },
  eyebrow: {
    color: '#3E63FF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  loginTitle: {
    marginTop: 10,
    color: '#0F172A',
    fontSize: 32,
    fontWeight: '800',
  },
  loginSubtitle: {
    marginTop: 8,
    marginBottom: 22,
    color: '#5B6474',
    fontSize: 15,
    lineHeight: 22,
  },
  showcaseEyebrow: {
    color: '#A5B4FC',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  showcaseTitle: {
    marginTop: 12,
    color: '#F8FAFC',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 36,
  },
  showcaseChartCard: {
    marginTop: 22,
    borderRadius: 28,
    padding: 22,
    minHeight: 170,
    backgroundColor: 'rgba(30, 41, 59, 0.78)',
    justifyContent: 'flex-end',
  },
  showcaseLine: {
    height: 4,
    borderRadius: 999,
    backgroundColor: '#3B82F6',
    width: '88%',
  },
  showcaseLineShort: {
    marginTop: 18,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#60A5FA',
    width: '62%',
  },
  showcaseLineDot: {
    position: 'absolute',
    top: 54,
    right: 64,
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: '#3B82F6',
    borderWidth: 4,
    borderColor: '#BFDBFE',
  },
  showcaseMetricRow: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  appShell: {
    flex: 1,
    padding: 18,
  },
  heroHeader: {
    borderRadius: 30,
    padding: 22,
    backgroundColor: 'rgba(248, 251, 255, 0.84)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.78)',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
    shadowColor: '#7C8AA5',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  pageTitle: {
    marginTop: 10,
    color: '#0F172A',
    fontSize: 28,
    fontWeight: '800',
  },
  pageSubtitle: {
    marginTop: 8,
    color: '#526072',
    fontSize: 14,
  },
  heroMeta: {
    minWidth: 260,
    padding: 16,
    borderRadius: 24,
    backgroundColor: 'rgba(231, 237, 255, 0.88)',
    gap: 4,
  },
  heroMetaTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '700',
  },
  heroMetaText: {
    color: '#526072',
    fontSize: 13,
  },
  ghostButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#DCE6FF',
  },
  ghostButtonText: {
    color: '#2643B8',
    fontSize: 13,
    fontWeight: '700',
  },
  banner: {
    marginTop: 14,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  bannerError: {
    backgroundColor: '#F9D7D2',
  },
  bannerSuccess: {
    backgroundColor: '#D9EECF',
  },
  bannerInfo: {
    backgroundColor: '#D6EAF0',
  },
  bannerText: {
    color: '#22302D',
    fontSize: 14,
    lineHeight: 20,
  },
  metricsRow: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    minWidth: 180,
    flexGrow: 1,
    borderRadius: 24,
    padding: 18,
    backgroundColor: 'rgba(244, 248, 255, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    shadowColor: '#8EA0C3',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  metricValue: {
    marginTop: 10,
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '800',
  },
  contentRow: {
    flex: 1,
    marginTop: 16,
    flexDirection: 'row',
    gap: 16,
  },
  contentColumn: {
    flexDirection: 'column',
  },
  mainColumn: {
    flex: 1.1,
  },
  sideColumn: {
    flex: 0.95,
  },
  fullWidthColumn: {
    flex: 1,
  },
  sideColumnStack: {
    gap: 16,
    paddingBottom: 40,
  },
  sectionCard: {
    borderRadius: 28,
    padding: 18,
    backgroundColor: 'rgba(248, 251, 255, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.76)',
    shadowColor: '#90A0BC',
    shadowOpacity: 0.14,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '800',
  },
  sectionSubtitle: {
    marginTop: 6,
    color: '#5B6474',
    fontSize: 13,
    lineHeight: 18,
  },
  toolbarRow: {
    marginTop: 16,
    marginBottom: 10,
  },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  filterChipRow: {
    gap: 10,
    paddingVertical: 6,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#E7EEFA',
  },
  filterChipActive: {
    backgroundColor: '#3E63FF',
  },
  filterChipPressed: {
    opacity: 0.82,
  },
  filterChipText: {
    color: '#405068',
    fontSize: 13,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#F9F6EE',
    fontSize: 13,
    fontWeight: '700',
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    gap: 10,
  },
  loadingText: {
    color: '#5F5A50',
    fontSize: 13,
  },
  cardStack: {
    marginTop: 12,
    gap: 12,
  },
  visitPlanCard: {
    borderRadius: 24,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: '#DBE5F5',
  },
  visitPlanCardActive: {
    borderColor: '#3E63FF',
    backgroundColor: '#EEF3FF',
  },
  visitPlanCardPressed: {
    opacity: 0.88,
  },
  visitPlanCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  visitPlanCardTitle: {
    flex: 1,
    color: '#1E2C28',
    fontSize: 18,
    fontWeight: '700',
  },
  visitPlanCardBadge: {
    color: '#315BFF',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  visitPlanCardMeta: {
    marginTop: 6,
    color: '#64748B',
    fontSize: 13,
  },
  formStack: {
    marginTop: 16,
    gap: 14,
  },
  formHeroStrip: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: '#E9EEFF',
  },
  formHeroTitle: {
    color: '#2241B6',
    fontSize: 16,
    fontWeight: '800',
  },
  formHeroText: {
    marginTop: 6,
    color: '#56657A',
    fontSize: 13,
    lineHeight: 18,
  },
  fieldBlock: {
    gap: 8,
  },
  fieldLabel: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  fieldHelper: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 17,
  },
  input: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D5E0F2',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#0F172A',
    fontSize: 15,
  },
  multilineInput: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  meetingResultInput: {
    marginTop: 10,
    minHeight: 130,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  segmentedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  segmentOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#E8EEFB',
  },
  segmentOptionActive: {
    backgroundColor: '#355CFF',
  },
  segmentOptionPressed: {
    opacity: 0.82,
  },
  segmentOptionText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
  segmentOptionTextActive: {
    color: '#F9F6EE',
    fontSize: 13,
    fontWeight: '700',
  },
  lookupTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  lookupMetaText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  lookupInput: {
    paddingRight: 18,
  },
  lookupSelectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#EEF3FF',
  },
  lookupSelectionLabel: {
    flex: 1,
    color: '#2643B8',
    fontSize: 13,
    fontWeight: '700',
  },
  clearSelectionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#DBE6FF',
  },
  clearSelectionText: {
    color: '#2643B8',
    fontSize: 12,
    fontWeight: '800',
  },
  lookupPanel: {
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderWidth: 1,
    borderColor: '#D5E0F2',
    overflow: 'hidden',
  },
  lookupScroll: {
    maxHeight: 180,
  },
  lookupHint: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#64748B',
    fontSize: 13,
  },
  lookupOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E7EEF8',
  },
  lookupOptionActive: {
    backgroundColor: '#EEF3FF',
  },
  lookupOptionPressed: {
    opacity: 0.85,
  },
  lookupOptionText: {
    color: '#1E293B',
    fontSize: 14,
  },
  primaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#355CFF',
    paddingHorizontal: 20,
  },
  primaryButtonPressed: {
    opacity: 0.88,
  },
  primaryButtonText: {
    color: '#F9F6EE',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#E6EEFF',
    paddingHorizontal: 18,
  },
  secondaryButtonMuted: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#E6EEFF',
    paddingHorizontal: 18,
    marginTop: 12,
  },
  secondaryButtonText: {
    color: '#2643B8',
    fontSize: 13,
    fontWeight: '800',
  },
  inlineActionButton: {
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  emptyState: {
    paddingVertical: 24,
    gap: 8,
  },
  emptyStateTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '700',
  },
  emptyStateDescription: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
  },
  detailStack: {
    marginTop: 14,
    gap: 12,
  },
  detailTitle: {
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '800',
  },
  detailMeta: {
    color: '#64748B',
    fontSize: 13,
  },
  detailSectionCard: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: '#F5F8FF',
    borderWidth: 1,
    borderColor: '#E3EAF8',
  },
  detailSectionTitle: {
    color: '#2241B6',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  detailBody: {
    color: '#1E293B',
    fontSize: 15,
    lineHeight: 22,
  },
  detailBodyMuted: {
    color: '#5B6474',
    fontSize: 14,
    lineHeight: 20,
  },
  statusUpdateBlock: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E3EAF8',
  },
  statusUpdateLabel: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
  },
  statusUpdateRow: {
    gap: 8,
  },
  statusAction: {
    borderRadius: 16,
    backgroundColor: '#E8EEFB',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statusActionActive: {
    backgroundColor: '#355CFF',
  },
  statusActionPressed: {
    opacity: 0.85,
  },
  statusActionText: {
    color: '#1E293B',
    fontSize: 13,
    fontWeight: '700',
  },
  statusActionTextActive: {
    color: '#F9F6EE',
    fontSize: 13,
    fontWeight: '700',
  },
});
