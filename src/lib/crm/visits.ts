/**
 * Visit-plan endpoints.
 *
 * Thin wrappers over request() — no client-side filtering or sorting. The server
 * applies the row-level scope, so anything the app filters out locally is data it
 * should never have received in the first place.
 */

import { request } from './client';
import type { Paginated, VisitPlan, VisitStatusValue } from './types';

export type VisitFilters = {
  status?: VisitStatusValue;
  client_id?: number;
  sector_id?: number;
  from?: string;
  to?: string;
  search?: string;
  per_page?: number;
  page?: number;
};

export function listVisits(filters: VisitFilters = {}, signal?: AbortSignal) {
  return request<Paginated<VisitPlan>>('/api/v1/visit-plans', { signal }, filters);
}

export function getVisit(id: number, signal?: AbortSignal) {
  return request<{ data: VisitPlan }>(`/api/v1/visit-plans/${id}`, { signal })
    .then((r) => r.data);
}

export type VisitDraft = {
  title: string;
  client_id: number;
  contact_id: number;
  sector_id: number;
  scheduled_at: string;
  participants?: string;
  notes?: string;
};

export function createVisit(draft: VisitDraft) {
  return request<{ data: VisitPlan }>('/api/v1/visit-plans', {
    method: 'POST',
    body: draft,
  }).then((r) => r.data);
}

export function updateVisit(id: number, draft: Partial<VisitDraft>) {
  return request<{ data: VisitPlan }>(`/api/v1/visit-plans/${id}`, {
    method: 'PUT',
    body: draft,
  }).then((r) => r.data);
}

/**
 * The server owns the state machine — a rejected transition comes back as a 422 with
 * a message explaining why, which the UI surfaces verbatim rather than pre-empting
 * with its own copy of the rules.
 */
export function setVisitStatus(id: number, status: VisitStatusValue) {
  return request<{ data: VisitPlan }>(`/api/v1/visit-plans/${id}/status`, {
    method: 'PATCH',
    body: { status },
  }).then((r) => r.data);
}

export function deleteVisit(id: number) {
  return request<{ message: string }>(`/api/v1/visit-plans/${id}`, { method: 'DELETE' });
}
