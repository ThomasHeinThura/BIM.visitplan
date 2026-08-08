/**
 * The client workspace — what a rep looks at while standing in front of the client.
 *
 * Contacts are tappable: phone numbers dial, addresses open maps. That is the single
 * most-used action from a client record, and making someone copy a number out by hand
 * is the difference between an app they use and one they abandon.
 */

import React from 'react';
import { Linking, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { fonts, radii, useTheme } from '../../context/ThemeContext';
import { getClient } from '../../lib/crm/clients';
import type { Contact } from '../../lib/crm/types';
import { Badge, Card, SectionHead } from '../ui';
import { ErrorState, LoadingState, NoAccessState } from './States';
import { useResource } from './useResource';

/**
 * Linking.openURL rejects when nothing can handle the scheme — a simulator with no
 * phone app, or a desktop browser. Swallowing that is right: a failed dial should do
 * nothing, not crash the screen the rep is reading from.
 */
async function open(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    // Intentionally ignored — see above.
  }
}

function mapsUrl(address: string) {
  const query = encodeURIComponent(address);

  return Platform.select({
    ios: `maps://?q=${query}`,
    android: `geo:0,0?q=${query}`,
    default: `https://maps.google.com/?q=${query}`,
  }) as string;
}

function ActionChip({ label, icon, onPress }: { label: string; icon: string; onPress: () => void }) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 12,
          paddingVertical: 7,
          borderRadius: radii.full,
          backgroundColor: theme.primaryLight,
        },
        pressed && { opacity: 0.75 },
      ]}
    >
      <Text style={{ fontSize: 13, color: theme.primary }}>{icon}</Text>
      <Text style={{ fontSize: 12, fontWeight: '600', color: theme.primary }}>{label}</Text>
    </Pressable>
  );
}

function ContactRow({ contact }: { contact: Contact }) {
  const { theme } = useTheme();

  return (
    <Card style={{ marginHorizontal: 16, marginBottom: 8 }}>
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text
            style={{ flex: 1, fontSize: 14, fontWeight: '600', color: theme.text, fontFamily: fonts.display }}
            numberOfLines={1}
          >
            {contact.name}
          </Text>
          {contact.is_primary ? <Badge tone="teal">Primary</Badge> : null}
        </View>

        {contact.job_title ? (
          <Text style={{ fontSize: 12, color: theme.textSecondary }}>{contact.job_title}</Text>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
          {contact.phone ? (
            <ActionChip label="Call" icon="✆" onPress={() => open(`tel:${contact.phone}`)} />
          ) : null}
          {contact.email ? (
            <ActionChip label="Email" icon="✉" onPress={() => open(`mailto:${contact.email}`)} />
          ) : null}
        </View>
      </View>
    </Card>
  );
}

export function ClientDetailScreen({ clientId }: { clientId: number }) {
  const { theme } = useTheme();

  const { data, loading, error, forbidden, refetch } = useResource(
    (signal) => getClient(clientId, signal),
    [clientId],
  );

  if (forbidden) return <NoAccessState what="this client" />;
  if (loading) return <LoadingState label="Loading client…" />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!data) return null;

  const contacts = data.contacts ?? [];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 14, gap: 6 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: theme.text, fontFamily: fonts.display }}>
          {data.name}
        </Text>

        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {data.sector ? <Badge tone="muted">{data.sector.name}</Badge> : null}
          {data.industry ? <Badge tone="muted">{data.industry}</Badge> : null}
        </View>
      </View>

      <View
        style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', paddingHorizontal: 16, marginTop: 12 }}
      >
        {data.phone ? <ActionChip label="Call" icon="✆" onPress={() => open(`tel:${data.phone}`)} /> : null}
        {data.email ? (
          <ActionChip label="Email" icon="✉" onPress={() => open(`mailto:${data.email}`)} />
        ) : null}
        {data.address ? (
          <ActionChip label="Directions" icon="◎" onPress={() => open(mapsUrl(data.address!))} />
        ) : null}
        {data.website ? (
          <ActionChip label="Website" icon="⌘" onPress={() => open(data.website!)} />
        ) : null}
      </View>

      {data.address ? (
        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
          <Card>
            <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 18 }}>
              {data.address}
            </Text>
          </Card>
        </View>
      ) : null}

      <SectionHead title={`Contacts (${data.counts.contacts ?? contacts.length})`} />

      {contacts.length === 0 ? (
        <View style={{ paddingHorizontal: 16 }}>
          <Card>
            <Text style={{ fontSize: 13, color: theme.textSecondary }}>
              No contacts recorded for this client yet.
            </Text>
          </Card>
        </View>
      ) : (
        contacts.map((contact) => <ContactRow key={contact.id} contact={contact} />)
      )}

      {data.notes ? (
        <>
          <SectionHead title="Notes" />
          <View style={{ paddingHorizontal: 16 }}>
            <Card>
              <Text style={{ fontSize: 13, color: theme.textSecondary, lineHeight: 19 }}>
                {data.notes}
              </Text>
            </Card>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}
