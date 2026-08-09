/**
 * The bell.
 *
 * Notifications are per-person and already scoped server-side — every query runs
 * through the signed-in user's own relation — so there is no filtering to do here and
 * no id from another user that these calls could reach.
 */

import { request } from "./client";
import type { AppNotification, Paginated } from "./types";

export function listNotifications(
  params: { unread_only?: boolean; per_page?: number; page?: number } = {},
  signal?: AbortSignal,
) {
  return request<
    Paginated<AppNotification> & { meta: { unread_count: number } }
  >("/api/v1/notifications", { signal }, params);
}

/**
 * The badge on its own.
 *
 * Deliberately separate from the list: this is the call the app makes on a timer, and
 * it must not pull a page of rows to answer with a number.
 */
export function getUnreadCount(signal?: AbortSignal) {
  return request<{ data: { unread_count: number } }>(
    "/api/v1/notifications/unread-count",
    { signal },
  ).then((r) => r.data.unread_count);
}

export function markNotificationRead(id: string) {
  return request<{ data: AppNotification; meta: { unread_count: number } }>(
    `/api/v1/notifications/${id}/read`,
    { method: "POST" },
  );
}

export function markAllNotificationsRead() {
  return request<{ data: { unread_count: number } }>(
    "/api/v1/notifications/read-all",
    {
      method: "POST",
    },
  ).then((r) => r.data.unread_count);
}
