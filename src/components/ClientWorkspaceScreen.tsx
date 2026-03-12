import React from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { styles } from '../styles';
import type {
  ClientContact,
  ClientFileRecord,
  ClientListItem,
  ClientNoteRecord,
  ClientOpportunity,
  ClientTimelineEvent,
  ClientWorkspaceSummary,
  VisitPlan,
} from '../types';

export type ClientWorkspaceTab =
  | 'timeline'
  | 'details'
  | 'contacts'
  | 'opportunities'
  | 'files'
  | 'notes'
  | 'visitplan'
  | 'technology';

const CLIENT_TABS: Array<{ id: ClientWorkspaceTab; label: string }> = [
  { id: 'timeline', label: 'Timeline' },
  { id: 'details', label: 'Details' },
  { id: 'contacts', label: 'Contacts' },
  { id: 'opportunities', label: 'Opportunities' },
  { id: 'files', label: 'Files' },
  { id: 'notes', label: 'Notes' },
  { id: 'visitplan', label: 'Visit Plan' },
  { id: 'technology', label: 'Technology Stacks' },
];

export function ClientWorkspaceScreen({
  clients,
  loadingClients,
  loadingWorkspace,
  searchText,
  onChangeSearchText,
  selectedClientId,
  onSelectClient,
  summary,
  activeTab,
  onChangeTab,
  timeline,
  contacts,
  opportunities,
  files,
  notes,
  visitPlans,
}: {
  clients: ClientListItem[];
  loadingClients: boolean;
  loadingWorkspace: boolean;
  searchText: string;
  onChangeSearchText: (value: string) => void;
  selectedClientId: number | null;
  onSelectClient: (clientId: number) => void;
  summary: ClientWorkspaceSummary | null;
  activeTab: ClientWorkspaceTab;
  onChangeTab: (tab: ClientWorkspaceTab) => void;
  timeline: ClientTimelineEvent[];
  contacts: ClientContact[];
  opportunities: ClientOpportunity[];
  files: ClientFileRecord[];
  notes: ClientNoteRecord[];
  visitPlans: VisitPlan[];
}) {
  return (
    <View style={styles.pageStack}>
      <View style={styles.pageHeaderCard}>
        <Text style={styles.pageTitle}>Client Workspace</Text>
        <Text style={styles.pageSubtitle}>
          Browse clients, then inspect timeline, contacts, opportunities, files, notes, visit plans, and technology stacks.
        </Text>
      </View>

      <View style={styles.clientWorkspaceLayout}>
        <View style={styles.clientDirectoryColumn}>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Clients</Text>
            <Text style={styles.sectionSubtitle}>Search by company name, status, or source.</Text>

            <TextInput
              value={searchText}
              onChangeText={onChangeSearchText}
              placeholder="Search clients"
              placeholderTextColor="#94A3B8"
              style={[styles.input, styles.searchInput, styles.clientSearchInput]}
            />

            <ScrollView style={styles.clientListScroll} contentContainerStyle={styles.clientListStack}>
              {loadingClients ? (
                <Text style={styles.lookupHint}>Loading clients...</Text>
              ) : clients.length === 0 ? (
                <Text style={styles.lookupHint}>No clients found.</Text>
              ) : (
                clients.map((client) => {
                  const active = client.id === selectedClientId;

                  return (
                    <Pressable
                      key={client.id}
                      onPress={() => onSelectClient(client.id)}
                      style={({ pressed }) => [
                        styles.clientListCard,
                        active ? styles.clientListCardActive : null,
                        pressed ? styles.lookupOptionPressed : null,
                      ]}
                    >
                      <Text style={styles.clientListTitle}>{client.name}</Text>
                      <Text style={styles.clientListMeta}>{client.status || 'No status'} | {client.source || 'No source'}</Text>
                      <View style={styles.clientListMetricsRow}>
                        <Text style={styles.clientListMetric}>{client.counts.contacts || 0} contacts</Text>
                        <Text style={styles.clientListMetric}>{client.counts.visit_plans || 0} plans</Text>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>

        <View style={styles.clientDetailColumn}>
          {!summary ? (
            <View style={styles.sectionCard}>
              <Text style={styles.emptyStateTitle}>Select a client</Text>
              <Text style={styles.emptyStateDescription}>
                Pick a client from the directory to load the workspace tabs.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>{summary.name}</Text>
                <Text style={styles.sectionSubtitle}>
                  {summary.status || 'No status'} | {summary.source || 'No source'}
                </Text>

                <View style={styles.clientSummaryGrid}>
                  <View style={styles.summaryStatCard}>
                    <Text style={styles.summaryStatLabel}>Contacts</Text>
                    <Text style={styles.summaryStatValue}>{summary.counts.contacts || 0}</Text>
                  </View>
                  <View style={styles.summaryStatCard}>
                    <Text style={styles.summaryStatLabel}>Visit Plans</Text>
                    <Text style={styles.summaryStatValue}>{summary.counts.visit_plans || 0}</Text>
                  </View>
                  <View style={styles.summaryStatCard}>
                    <Text style={styles.summaryStatLabel}>Opportunities</Text>
                    <Text style={styles.summaryStatValue}>{summary.counts.opportunities || 0}</Text>
                  </View>
                  <View style={styles.summaryStatCard}>
                    <Text style={styles.summaryStatLabel}>Open Tickets</Text>
                    <Text style={styles.summaryStatValue}>{summary.counts.tickets_open || 0}</Text>
                  </View>
                </View>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipRow}>
                {CLIENT_TABS.map((tab) => {
                  const active = tab.id === activeTab;

                  return (
                    <Pressable
                      key={tab.id}
                      onPress={() => onChangeTab(tab.id)}
                      style={({ pressed }) => [
                        styles.workspaceTabButton,
                        active ? styles.workspaceTabButtonActive : null,
                        pressed ? styles.filterChipPressed : null,
                      ]}
                    >
                      <Text style={active ? styles.workspaceTabButtonTextActive : styles.workspaceTabButtonText}>
                        {tab.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={styles.sectionCard}>
                {loadingWorkspace ? (
                  <Text style={styles.lookupHint}>Loading client workspace...</Text>
                ) : activeTab === 'timeline' ? (
                  <EntityList
                    emptyTitle="No timeline activity"
                    emptyDescription="There are no timeline events for this client yet."
                    items={timeline.map((event) => ({
                      id: event.id,
                      title: event.parent_title || event.item_lang || event.item || 'Activity',
                      meta: `${event.created_at || 'Unknown date'}${event.creator?.name ? ` | ${event.creator.name}` : ''}`,
                      body: event.content || event.content_secondary || 'No event details available.',
                    }))}
                  />
                ) : activeTab === 'details' ? (
                  <ClientDetails summary={summary} />
                ) : activeTab === 'contacts' ? (
                  <EntityList
                    emptyTitle="No contacts"
                    emptyDescription="No client contacts were returned for this account."
                    items={contacts.map((contact) => ({
                      id: contact.id,
                      title: contact.name,
                      meta: `${contact.position || 'No position'}${contact.account_owner ? ' | Account owner' : ''}`,
                      body: `${contact.email || 'No email'}${contact.phone ? ` | ${contact.phone}` : ''}`,
                    }))}
                  />
                ) : activeTab === 'opportunities' ? (
                  <EntityList
                    emptyTitle="No opportunities"
                    emptyDescription="No renewal opportunities were returned for this client."
                    items={opportunities.map((opportunity) => ({
                      id: opportunity.id,
                      title: opportunity.title || 'Untitled opportunity',
                      meta: `${opportunity.status || 'No status'}${opportunity.probability != null ? ` | Probability ${opportunity.probability}` : ''}`,
                      body: opportunity.description || 'No opportunity description available.',
                    }))}
                  />
                ) : activeTab === 'files' ? (
                  <EntityList
                    emptyTitle="No files"
                    emptyDescription="No files were returned for this client."
                    items={files.map((file) => ({
                      id: file.id,
                      title: file.title || file.filename || 'Untitled file',
                      meta: `${file.mime || 'Unknown type'}${file.created_at ? ` | ${file.created_at}` : ''}`,
                      body: file.filename || 'No filename available.',
                    }))}
                  />
                ) : activeTab === 'notes' ? (
                  <EntityList
                    emptyTitle="No notes"
                    emptyDescription="No notes were returned for this client."
                    items={notes.map((note) => ({
                      id: note.id,
                      title: note.title || 'Untitled note',
                      meta: `${note.created_at || 'Unknown date'}${note.creator?.name ? ` | ${note.creator.name}` : ''}`,
                      body: note.description || 'No note body available.',
                    }))}
                  />
                ) : activeTab === 'visitplan' ? (
                  <EntityList
                    emptyTitle="No visit plans"
                    emptyDescription="No visit plans were returned for this client."
                    items={visitPlans.map((visitPlan) => ({
                      id: visitPlan.id,
                      title: visitPlan.title,
                      meta: `${visitPlan.date} | ${visitPlan.start_time} - ${visitPlan.end_time}`,
                      body: visitPlan.agenda,
                    }))}
                  />
                ) : (
                  <View style={styles.detailSectionCard}>
                    <Text style={styles.detailSectionTitle}>Technology Stack</Text>
                    <Text style={styles.detailBodyMuted}>
                      {summary.technology_stack?.trim() || 'No technology stack recorded for this client.'}
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

function ClientDetails({ summary }: { summary: ClientWorkspaceSummary }) {
  return (
    <View style={styles.clientDetailsStack}>
      <View style={styles.detailSectionCard}>
        <Text style={styles.detailSectionTitle}>Description</Text>
        <Text style={styles.detailBodyMuted}>
          {summary.description?.trim() || 'No client description recorded.'}
        </Text>
      </View>

      <View style={styles.detailSectionCard}>
        <Text style={styles.detailSectionTitle}>Primary Contact</Text>
        <Text style={styles.detailBodyMuted}>
          {summary.primary_contact
            ? `${summary.primary_contact.name} | ${summary.primary_contact.email || 'No email'}${summary.primary_contact.phone ? ` | ${summary.primary_contact.phone}` : ''}`
            : 'No account owner recorded.'}
        </Text>
      </View>

      <View style={styles.detailSectionCard}>
        <Text style={styles.detailSectionTitle}>Business Context</Text>
        <Text style={styles.detailBodyMuted}>
          Sector: {summary.sector || 'Not set'}
        </Text>
        <Text style={styles.detailBodyMuted}>
          Business Unit: {summary.business_unit || 'Not set'}
        </Text>
        <Text style={styles.detailBodyMuted}>
          Tags: {summary.tags.length > 0 ? summary.tags.map((tag) => tag.title).join(', ') : 'No tags'}
        </Text>
      </View>
    </View>
  );
}

function EntityList({
  items,
  emptyTitle,
  emptyDescription,
}: {
  items: Array<{ id: number; title: string; meta: string; body: string }>;
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (items.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateTitle}>{emptyTitle}</Text>
        <Text style={styles.emptyStateDescription}>{emptyDescription}</Text>
      </View>
    );
  }

  return (
    <View style={styles.entityListStack}>
      {items.map((item) => (
        <View key={item.id} style={styles.summaryListCard}>
          <Text style={styles.visitPlanCardTitle}>{item.title}</Text>
          <Text style={styles.visitPlanCardMeta}>{item.meta}</Text>
          <Text style={styles.detailBodyMuted}>{item.body}</Text>
        </View>
      ))}
    </View>
  );
}