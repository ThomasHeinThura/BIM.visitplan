/**
 * The signed-in shell: header, tab bar, and the current screen.
 *
 * Tabs are derived from the permission list in /api/auth/me, so a user is never shown
 * a tab that would 403 when opened. That is presentation only — the server still
 * authorizes every request, and it must, because a client-side check protects nothing.
 *
 * Navigation is state-based for now. That does not survive the full screen count and
 * is documented as such: Expo Router is the agreed target, and moving to it is its own
 * change so a navigation rewrite is never mixed into a data-layer commit.
 */

import React, { useState } from 'react';
import { Platform, Pressable, StatusBar, Text, View } from 'react-native';

import { fonts, radii, useTheme } from '../../context/ThemeContext';
import type { CrmUser } from '../../lib/crm/auth';
import type { Client, Deal, VisitPlan } from '../../lib/crm/types';
import { ClientDetailScreen } from './ClientDetailScreen';
import { ClientListScreen } from './ClientListScreen';
import { DashboardScreen } from './DashboardScreen';
import { DealDetailScreen } from './DealDetailScreen';
import { DealFormScreen } from './DealFormScreen';
import { LeadListScreen } from './LeadListScreen';
import { PipelineScreen } from './PipelineScreen';
import { VisitListScreen } from './VisitListScreen';

type TabKey = 'today' | 'visits' | 'pipeline' | 'leads' | 'clients' | 'profile';

type Tab = {
  key: TabKey;
  label: string;
  icon: string;
  /** Permission required to see the tab; undefined means always available. */
  permission?: string;
};

const TABS: Tab[] = [
  { key: 'today', label: 'Today', icon: '◷' },
  { key: 'visits', label: 'Visits', icon: '≡', permission: 'visit_plans.view' },
  { key: 'pipeline', label: 'Pipeline', icon: '▦', permission: 'deals.view' },
  { key: 'leads', label: 'Leads', icon: '◈', permission: 'deals.view' },
  { key: 'clients', label: 'Clients', icon: '◇', permission: 'clients.view' },
  { key: 'profile', label: 'Profile', icon: '○' },
];

/** A view stacked over a tab — cleared by switching tabs or pressing back. */
type Detail =
  | { type: 'client'; id: number; title: string }
  | { type: 'deal'; id: number; title: string }
  | { type: 'deal-new'; title: string }
  | { type: 'deal-edit'; deal: Deal; title: string };

export function AppShell({ user, onSignOut }: { user: CrmUser; onSignOut: () => void }) {
  const { theme, isDark, toggle } = useTheme();

  const permissions = new Set(user.permissions ?? []);
  const tabs = TABS.filter((tab) => !tab.permission || permissions.has(tab.permission));

  const [tab, setTab] = useState<TabKey>('today');
  const [detail, setDetail] = useState<Detail | null>(null);

  // Bumped after a save so the list and board behind the form refetch. Without it a
  // newly created lead is invisible until the user switches tabs and back.
  const [formKey, setFormKey] = useState(0);

  const openClient = (client: Client) =>
    setDetail({ type: 'client', id: client.id, title: client.name });

  const addLead = () => setDetail({ type: 'deal-new', title: 'New lead' });

  // A tap opens the deal, not the edit form. Previously the only way to look at a deal
  // was to start changing it, which also meant anyone without update rights could not
  // open one at all — including the collaborators this feature exists to give access to.
  const openDeal = (deal: Deal) => setDetail({ type: 'deal', id: deal.id, title: deal.title });

  const editDeal = (deal: Deal) =>
    setDetail(
      deal.can.update
        ? { type: 'deal-edit', deal, title: deal.title }
        // Without update rights there is nothing to edit, so opening the form would
        // only lead to a 403 on save.
        : null,
    );

  const afterDealSaved = () => {
    setDetail((current) =>
      // Editing returns to the deal just saved rather than the list, so the change is
      // visible where it was made instead of costing the user their place.
      current?.type === 'deal-edit'
        ? { type: 'deal', id: current.deal.id, title: current.deal.title }
        : null,
    );
    setFormKey((key) => key + 1);
  };

  // Visits have no detail screen yet — that arrives with check-in/out and outcomes in
  // the next slice. Until then a tap moves to the visit list rather than doing nothing,
  // because a dead tap reads as a bug.
  const openVisit = (_visit: VisitPlan) => {
    setDetail(null);
    setTab('visits');
  };

  const goBack = () => setDetail(null);

  const switchTab = (next: TabKey) => {
    setDetail(null);
    setTab(next);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Android draws content under the status bar unless it is told not to. */}
      <View style={{ height: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0 }} />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: theme.surface,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          {detail ? (
            <Pressable onPress={goBack} hitSlop={10}>
              <Text style={{ fontSize: 18, color: theme.primary }}>‹</Text>
            </Pressable>
          ) : null}

          <Text
            numberOfLines={1}
            style={{ fontSize: 16, fontWeight: '700', color: theme.text, fontFamily: fonts.display }}
          >
            {detail ? detail.title : 'BIM VisitPlan'}
          </Text>
        </View>

        <Pressable onPress={toggle} hitSlop={10} style={{ padding: 4 }}>
          <Text style={{ fontSize: 15, color: theme.textSecondary }}>{isDark ? '☀' : '☾'}</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1 }}>
        {detail?.type === 'client' ? (
          <ClientDetailScreen clientId={detail.id} />
        ) : detail?.type === 'deal' ? (
          <DealDetailScreen key={`deal-${detail.id}-${formKey}`} dealId={detail.id} onEdit={editDeal} />
        ) : detail?.type === 'deal-new' ? (
          <DealFormScreen
            // Remounts the form after a save so the next "add lead" starts blank
            // rather than inheriting the previous draft.
            key={formKey}
            onSaved={afterDealSaved}
            onCancel={goBack}
          />
        ) : detail?.type === 'deal-edit' ? (
          <DealFormScreen key={formKey} deal={detail.deal} onSaved={afterDealSaved} onCancel={goBack} />
        ) : tab === 'today' ? (
          <DashboardScreen
            onOpenVisit={openVisit}
            onSeeAllVisits={() => switchTab('visits')}
            onOpenDeal={(id) => setDetail({ type: 'deal', id, title: 'Deal' })}
          />
        ) : tab === 'visits' ? (
          <VisitListScreen onOpenVisit={openVisit} />
        ) : tab === 'pipeline' ? (
          <PipelineScreen key={`pipeline-${formKey}`} onEditDeal={openDeal} />
        ) : tab === 'leads' ? (
          <LeadListScreen
            key={`leads-${formKey}`}
            canCreate={permissions.has('deals.create')}
            onAddLead={addLead}
            onOpenDeal={openDeal}
          />
        ) : tab === 'clients' ? (
          <ClientListScreen onOpenClient={openClient} />
        ) : (
          <ProfilePanel user={user} onSignOut={onSignOut} />
        )}
      </View>

      <View
        style={{
          flexDirection: 'row',
          backgroundColor: theme.navBg,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          paddingBottom: Platform.OS === 'ios' ? 22 : 8,
          paddingTop: 8,
        }}
      >
        {tabs.map((item) => {
          const active = tab === item.key && !detail;

          return (
            <Pressable
              key={item.key}
              onPress={() => switchTab(item.key)}
              style={{ flex: 1, alignItems: 'center', gap: 3, paddingVertical: 4 }}
            >
              <Text style={{ fontSize: 17, color: active ? theme.navTextActive : theme.navText }}>
                {item.icon}
              </Text>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: active ? '700' : '500',
                  color: active ? theme.navTextActive : theme.navText,
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ProfilePanel({ user, onSignOut }: { user: CrmUser; onSignOut: () => void }) {
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1, padding: 16, gap: 14 }}>
      <View
        style={{
          backgroundColor: theme.surface,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: theme.border,
          padding: 16,
          gap: 6,
        }}
      >
        <Text style={{ fontSize: 17, fontWeight: '700', color: theme.text, fontFamily: fonts.display }}>
          {user.name}
        </Text>
        <Text style={{ fontSize: 13, color: theme.textSecondary }}>{user.email}</Text>

        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          {(user.roles ?? []).map((role) => (
            <View
              key={role}
              style={{
                backgroundColor: theme.primaryLight,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: radii.full,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '600', color: theme.primary }}>{role}</Text>
            </View>
          ))}
        </View>

        {(user.sectors ?? []).length > 0 ? (
          <Text style={{ fontSize: 12, color: theme.textFaint, marginTop: 4 }}>
            Sectors: {(user.sectors ?? []).map((s) => s.name).join(', ')}
          </Text>
        ) : null}
      </View>

      <Pressable
        onPress={onSignOut}
        style={({ pressed }) => [
          {
            backgroundColor: theme.errorLight,
            borderRadius: radii.md,
            paddingVertical: 13,
            alignItems: 'center',
          },
          pressed && { opacity: 0.8 },
        ]}
      >
        <Text style={{ color: theme.error, fontWeight: '700', fontSize: 14 }}>Sign out</Text>
      </Pressable>
    </View>
  );
}
