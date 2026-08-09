/**
 * The bell, as a screen.
 *
 * A panel hanging off a header icon works on a desktop; on a phone it would cover most
 * of what it is explaining. So notifications get the whole screen, reachable from the
 * bell in the header.
 *
 * Tapping an entry marks it read and opens what it is about. Marking read on tap rather
 * than on render is deliberate: a list that clears itself the moment it appears leaves
 * someone who glanced at it with no way to find the thing they half-saw.
 */

import React, { useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

import { useTheme } from "../../context/ThemeContext";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../lib/crm/notifications";
import type { AppNotification } from "../../lib/crm/types";
import { alpha, radius, space, type } from "../../ui/tokens";
import { EmptyState, ErrorState, LoadingState } from "./States";
import { useResource } from "./useResource";

/** Colour by what the notification is about, so the list is scannable without reading. */
function tintFor(
  kind: string | null,
  theme: { primary: string; textSecondary: string },
): string {
  switch (kind) {
    case "deal.won":
      return "#10B981";
    case "deal.transfer_requested":
      return "#F59E0B";
    case "deal.transfer_decided":
      return "#6366F1";
    case "deal.collaborator_added":
      return theme.primary;
    default:
      return theme.textSecondary;
  }
}

function relativeTime(value: string | null): string {
  if (!value) return "";

  const then = new Date(value).getTime();
  const minutes = Math.round((Date.now() - then) / 60000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h ago`;
  if (minutes < 60 * 24 * 7) return `${Math.round(minutes / (60 * 24))}d ago`;

  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

export function NotificationScreen({
  onOpenDeal,
  onUnreadChange,
}: {
  onOpenDeal?: (dealId: number) => void;
  /** Lets the header badge follow the list without its own request. */
  onUnreadChange?: (count: number) => void;
}) {
  const { theme } = useTheme();
  const [busy, setBusy] = useState(false);

  const state = useResource((signal) =>
    listNotifications({ per_page: 30 }, signal),
  );

  if (state.loading && !state.data)
    return <LoadingState label="Loading notifications…" />;
  if (state.error)
    return <ErrorState message={state.error} onRetry={state.refetch} />;

  const items = state.data?.data ?? [];
  const unread = state.data?.meta.unread_count ?? 0;

  async function open(notification: AppNotification) {
    if (notification.read_at === null) {
      try {
        const result = await markNotificationRead(notification.id);
        onUnreadChange?.(result.meta.unread_count);
      } catch {
        // Opening the thing matters more than the read flag; the next refresh corrects it.
      }
    }

    if (notification.deal_id !== null) onOpenDeal?.(notification.deal_id);

    state.refetch();
  }

  async function readAll() {
    setBusy(true);
    try {
      const remaining = await markAllNotificationsRead();
      onUnreadChange?.(remaining);
      state.refetch();
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={{
        paddingVertical: space.md,
        paddingBottom: space.xxl,
      }}
      refreshControl={
        <RefreshControl
          refreshing={state.refreshing}
          onRefresh={state.refetch}
        />
      }
    >
      {unread > 0 ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: space.lg,
            paddingBottom: space.md,
          }}
        >
          <Text style={[type.bodySm, { color: theme.textSecondary }]}>
            {unread} unread
          </Text>
          <Pressable disabled={busy} hitSlop={8} onPress={() => void readAll()}>
            <Text
              style={[type.bodySm, { color: theme.primary, fontWeight: "700" }]}
            >
              Mark all read
            </Text>
          </Pressable>
        </View>
      ) : null}

      {items.length === 0 ? (
        <View style={{ paddingHorizontal: space.lg }}>
          <EmptyState
            icon="◔"
            title="Nothing yet"
            message="Deals you are added to, transfers waiting on you, and wins in your sector show up here."
          />
        </View>
      ) : (
        items.map((notification) => {
          const tint = tintFor(notification.kind, theme);
          const isUnread = notification.read_at === null;

          return (
            <Pressable
              key={notification.id}
              onPress={() => void open(notification)}
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  gap: space.md,
                  marginHorizontal: space.lg,
                  marginBottom: space.sm,
                  padding: space.md,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: isUnread ? alpha(tint, 0.35) : theme.border,
                  // Unread carries a tint; read fades back to the surface rather than
                  // disappearing, so a list that has been dealt with still reads as a list.
                  backgroundColor: isUnread ? alpha(tint, 0.07) : theme.surface,
                },
                pressed && { opacity: 0.7 },
              ]}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: radius.pill,
                  marginTop: 6,
                  backgroundColor: isUnread ? tint : "transparent",
                }}
              />

              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: space.sm,
                  }}
                >
                  <Text
                    style={[
                      type.body,
                      {
                        flex: 1,
                        color: theme.text,
                        fontWeight: isUnread ? "700" : "600",
                      },
                    ]}
                  >
                    {notification.title}
                  </Text>
                  <Text style={[type.micro, { color: theme.textFaint }]}>
                    {relativeTime(notification.created_at)}
                  </Text>
                </View>

                <Text
                  style={[
                    type.bodySm,
                    { color: theme.textSecondary, marginTop: 2 },
                  ]}
                >
                  {notification.message}
                </Text>

                {notification.requires_action ? (
                  <View
                    style={{
                      alignSelf: "flex-start",
                      marginTop: 6,
                      paddingHorizontal: space.sm,
                      paddingVertical: 2,
                      borderRadius: radius.pill,
                      backgroundColor: alpha("#F59E0B", 0.16),
                    }}
                  >
                    <Text
                      style={[
                        type.micro,
                        { color: "#B45309", fontWeight: "800" },
                      ]}
                    >
                      NEEDS YOU
                    </Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}
