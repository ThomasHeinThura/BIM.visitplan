/**
 * Who is on a deal, and moving a deal between account managers.
 *
 * Two operations that look similar and are not. Adding a colleague is additive and
 * immediate — the owner keeps the deal. Transferring it takes the outgoing AM's access
 * away, so it is a request a sector head decides. The API keeps them on separate
 * endpoints for that reason, and so does this module.
 */

import { request } from './client';
import type {
  DealCollaborator,
  DealTransferRequest,
  ExchangeRate,
  Paginated,
  Person,
} from './types';

export type CollaboratorRole = 'sales' | 'consultant';

/** The CRM roles eligible for each slot. Mirrors CollaboratorRole::eligibleRoles(). */
export const ELIGIBLE_ROLES: Record<CollaboratorRole, string[]> = {
  sales: ['sales_exec', 'account_manager'],
  consultant: ['consultant'],
};

export function listCollaborators(dealId: number, signal?: AbortSignal) {
  return request<{ data: DealCollaborator[] }>(
    `/api/v1/deals/${dealId}/collaborators`,
    { signal },
  ).then((r) => r.data);
}

export function addCollaborator(dealId: number, userId: number, role: CollaboratorRole) {
  return request<{ data: DealCollaborator }>(`/api/v1/deals/${dealId}/collaborators`, {
    method: 'POST',
    body: { user_id: userId, role },
  }).then((r) => r.data);
}

/** Idempotent server-side: removing someone not on the deal is a 204, not a 404. */
export function removeCollaborator(dealId: number, userId: number) {
  return request<void>(`/api/v1/deals/${dealId}/collaborators/${userId}`, {
    method: 'DELETE',
  });
}

export function listTransfers(dealId: number, signal?: AbortSignal) {
  return request<{ data: DealTransferRequest[] }>(
    `/api/v1/deals/${dealId}/transfers`,
    { signal },
  ).then((r) => r.data);
}

/**
 * What the signed-in user can decide. Returns an empty list rather than a 403 for
 * anyone who cannot approve, so the badge can call it unconditionally.
 */
export function listPendingTransfers(signal?: AbortSignal) {
  return request<{ data: DealTransferRequest[] }>('/api/v1/transfers/pending', { signal })
    .then((r) => r.data);
}

export function requestTransfer(dealId: number, toUserId: number, reason?: string) {
  return request<{ data: DealTransferRequest }>(`/api/v1/deals/${dealId}/transfers`, {
    method: 'POST',
    body: { to_user_id: toUserId, reason: reason || null },
  }).then((r) => r.data);
}

export function approveTransfer(transferId: number, note?: string) {
  return request<{ data: DealTransferRequest }>(`/api/v1/transfers/${transferId}/approve`, {
    method: 'POST',
    body: { note: note || null },
  }).then((r) => r.data);
}

export function rejectTransfer(transferId: number, note?: string) {
  return request<{ data: DealTransferRequest }>(`/api/v1/transfers/${transferId}/reject`, {
    method: 'POST',
    body: { note: note || null },
  }).then((r) => r.data);
}

export function withdrawTransfer(transferId: number) {
  return request<{ data: DealTransferRequest }>(`/api/v1/transfers/${transferId}`, {
    method: 'DELETE',
  }).then((r) => r.data);
}

/**
 * The colleague directory behind every picker.
 *
 * Searched server-side and paginated, never preloaded: a list of everyone stops being
 * selectable long before it stops rendering.
 */
export function searchPeople(
  params: { search?: string; role?: string[]; exclude_self?: boolean; per_page?: number },
  signal?: AbortSignal,
) {
  const query: Record<string, string | number | boolean | undefined> = {
    search: params.search,
    exclude_self: params.exclude_self,
    per_page: params.per_page ?? 25,
  };

  // The API takes role as an array; URLSearchParams needs the bracket form for that.
  params.role?.forEach((role, index) => {
    query[`role[${index}]`] = role;
  });

  return request<Paginated<Person>>('/api/v1/people', { signal }, query);
}

/**
 * The official USD to MMK rate.
 *
 * `data` is null when none has been filed. Deliberately not defaulted to 1 by the
 * server: an identity conversion produces kyat figures that are actually dollars.
 */
export function getExchangeRate(signal?: AbortSignal) {
  return request<{ data: ExchangeRate | null; can_manage: boolean }>(
    '/api/v1/exchange-rate',
    { signal },
  );
}
