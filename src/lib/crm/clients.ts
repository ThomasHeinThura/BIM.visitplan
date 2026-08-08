/**
 * Client and dashboard endpoints.
 */

import { request } from './client';
import type { Client, Dashboard, Paginated, SectorSummary, VisitPlan } from './types';

export type ClientFilters = {
  sector_id?: number;
  search?: string;
  per_page?: number;
  page?: number;
};

export function listClients(filters: ClientFilters = {}, signal?: AbortSignal) {
  return request<Paginated<Client>>('/api/v1/clients', { signal }, filters);
}

/**
 * The workspace view — contacts and counts arrive with the client in one response,
 * so opening a client at a customer site costs one round trip rather than four.
 */
export function getClient(id: number, signal?: AbortSignal) {
  return request<{ data: Client }>(`/api/v1/clients/${id}`, { signal }).then((r) => r.data);
}

export function listClientVisits(id: number, signal?: AbortSignal) {
  return request<Paginated<VisitPlan>>(`/api/v1/clients/${id}/visit-plans`, { signal });
}

export function getDashboard(signal?: AbortSignal) {
  return request<{ data: Dashboard }>('/api/v1/dashboard', { signal }).then((r) => r.data);
}

export function listSectors(signal?: AbortSignal) {
  return request<{ data: SectorSummary[] }>('/api/v1/sectors', { signal }).then((r) => r.data);
}
