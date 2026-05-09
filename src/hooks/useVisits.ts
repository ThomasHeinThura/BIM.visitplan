/**
 * useVisits.ts — Visit data hook (TanStack Query)
 *
 * Provides visit list, single visit, create, update, check-in, check-out.
 * Scopes queries to the AM's own visits for 'am' role; all visits for managers.
 *
 * Usage:
 *   const { visits, isLoading, error, createVisit, checkIn } = useVisits({ userId, role });
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  checkInVisit,
  checkOutVisit,
  getVisit,
  getVisits,
  getVisitsByAm,
  upsertVisit,
} from '../lib/cockpit';
import type { CockpitUser, CockpitVisit } from '../types';

// ─── Query keys ─────────────────────────────────────────────────────────────

export const visitKeys = {
  all: ['visits'] as const,
  lists: () => [...visitKeys.all, 'list'] as const,
  list: (userId: string, role: string) => [...visitKeys.lists(), userId, role] as const,
  detail: (id: string) => [...visitKeys.all, 'detail', id] as const,
  today: (userId: string, role: string) => [...visitKeys.all, 'today', userId, role] as const,
};

// ─── useVisits ───────────────────────────────────────────────────────────────

type UseVisitsOptions = {
  /** Current user's Cockpit _id */
  userId: string;
  /** Current user's role */
  role: CockpitUser['role'];
  /** Optional date filter (YYYY-MM-DD) — pass null for all dates */
  date?: string | null;
  /** Max items to fetch */
  limit?: number;
};

export function useVisits({ userId, role, date, limit = 50 }: UseVisitsOptions) {
  const queryClient = useQueryClient();

  const isAm = role === 'am';

  // ── Fetch list ─────────────────────────────────────────────────────────
  const listQuery = useQuery({
    queryKey: visitKeys.list(userId, role),
    queryFn: () => {
      if (isAm) {
        return getVisitsByAm(userId, { limit });
      }
      return getVisits({
        filter: date ? { date } : undefined,
        limit,
        sort: { date: -1 },
      });
    },
    staleTime: 60_000, // 1 minute
  });

  // ── Today's visits (Home screen) ───────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const todayQuery = useQuery({
    queryKey: visitKeys.today(userId, role),
    queryFn: () => {
      if (isAm) {
        return getVisits({ filter: { 'assigned_am._id': userId, date: today }, limit: 20, sort: { start_time: 1 } });
      }
      return getVisits({ filter: { date: today }, limit: 50, sort: { start_time: 1 } });
    },
    staleTime: 30_000,
  });

  // ── Create visit ───────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: Omit<CockpitVisit, '_id'>) => upsertVisit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitKeys.lists() });
    },
  });

  // ── Update visit ───────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: (data: Partial<CockpitVisit> & { _id: string }) => upsertVisit(data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: visitKeys.lists() });
      queryClient.invalidateQueries({ queryKey: visitKeys.detail(updated._id) });
    },
  });

  // ── Check in ──────────────────────────────────────────────────────────
  const checkInMutation = useMutation({
    mutationFn: ({
      id,
      coords,
    }: {
      id: string;
      coords: { lat: number; lng: number };
    }) => checkInVisit(id, coords, new Date().toISOString()),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: visitKeys.lists() });
      queryClient.invalidateQueries({ queryKey: visitKeys.detail(updated._id) });
    },
  });

  // ── Check out ─────────────────────────────────────────────────────────
  const checkOutMutation = useMutation({
    mutationFn: (id: string) => checkOutVisit(id, new Date().toISOString()),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: visitKeys.lists() });
      queryClient.invalidateQueries({ queryKey: visitKeys.detail(updated._id) });
    },
  });

  return {
    /** All visits (scoped by role) */
    visits: listQuery.data ?? [],
    isLoading: listQuery.isLoading,
    error: listQuery.error instanceof Error ? listQuery.error.message : null,
    refetch: listQuery.refetch,

    /** Today's visits for the Home screen */
    todayVisits: todayQuery.data ?? [],
    todayLoading: todayQuery.isLoading,
    refetchToday: todayQuery.refetch,

    /** Create a new visit */
    createVisit: createMutation.mutateAsync,
    creating: createMutation.isPending,

    /** Update an existing visit */
    updateVisit: updateMutation.mutateAsync,
    updating: updateMutation.isPending,

    /** Check in to a visit (captures GPS + timestamp) */
    checkIn: checkInMutation.mutateAsync,
    checkingIn: checkInMutation.isPending,

    /** Check out of a visit */
    checkOut: checkOutMutation.mutateAsync,
    checkingOut: checkOutMutation.isPending,
  };
}

// ─── useVisit (single detail) ────────────────────────────────────────────────

export function useVisit(id: string | null) {
  return useQuery({
    queryKey: visitKeys.detail(id ?? ''),
    queryFn: () => getVisit(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}
