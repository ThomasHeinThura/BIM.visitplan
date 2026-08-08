/**
 * Deal and pipeline endpoints.
 *
 * "Lead" is a filter, not a type: listDeals({ stage_type: 'lead' }). Filtering by type
 * rather than stage id is what makes a lead list work for someone who sees more than
 * one sector, since each sector's lead stage is a different row.
 */

import { request } from './client';
import type { Deal, Paginated, Pipeline, StageTypeValue } from './types';

export type DealFilters = {
  stage_id?: number;
  stage_type?: StageTypeValue;
  sector_id?: number;
  client_id?: number;
  search?: string;
  per_page?: number;
  page?: number;
};

export function listDeals(filters: DealFilters = {}, signal?: AbortSignal) {
  return request<Paginated<Deal>>('/api/v1/deals', { signal }, filters);
}

export function getDeal(id: number, signal?: AbortSignal) {
  return request<{ data: Deal }>(`/api/v1/deals/${id}`, { signal }).then((r) => r.data);
}

/**
 * The whole board in one response — every stage, including empty ones, so a column a
 * deal could be moved into is never missing from the UI.
 */
export function getPipeline(sectorId?: number, signal?: AbortSignal) {
  return request<{ data: Pipeline }>(
    '/api/v1/deals/pipeline',
    { signal },
    sectorId ? { sector_id: sectorId } : undefined,
  ).then((r) => r.data);
}

export type DealDraft = {
  title: string;
  sector_id: number;
  /** Omit to land on the sector's lead stage — which is what "add a lead" means. */
  stage_id?: number;
  client_id?: number;
  contact_id?: number;
  value?: string;
  /** Omit to take the column default (USD). Sending null is a 422, not a default. */
  currency?: 'USD' | 'MMK';
  notes?: string;
};

export function createDeal(draft: DealDraft) {
  return request<{ data: Deal }>('/api/v1/deals', { method: 'POST', body: draft })
    .then((r) => r.data);
}

export function updateDeal(id: number, draft: Partial<Omit<DealDraft, 'sector_id' | 'stage_id'>>) {
  return request<{ data: Deal }>(`/api/v1/deals/${id}`, { method: 'PUT', body: draft })
    .then((r) => r.data);
}

/** Moving a card. Separate from updateDeal so the common action has a small payload. */
export function moveDealStage(id: number, stageId: number) {
  return request<{ data: Deal }>(`/api/v1/deals/${id}/stage`, {
    method: 'PATCH',
    body: { stage_id: stageId },
  }).then((r) => r.data);
}
