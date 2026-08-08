/**
 * A small fetch-state hook.
 *
 * react-query is already a dependency and is the right long-term home for this, but
 * it needs a QueryClientProvider and a cache-persistence decision that belong with
 * the navigation work. This keeps the screens honest in the meantime: one place that
 * models loading, error and forbidden, so no screen invents its own.
 *
 * It aborts in-flight requests on unmount and on refetch, which is what stops a slow
 * response from overwriting a newer one.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { CrmApiError } from '../../lib/crm/client';

export type ResourceState<T> = {
  data: T | null;
  loading: boolean;
  /** Populated for real failures only; a 403 sets `forbidden` instead. */
  error: string | null;
  forbidden: boolean;
  refetch: () => void;
  /** True while a refetch runs over data that is already on screen. */
  refreshing: boolean;
};

export function useResource<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: unknown[] = [],
): ResourceState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  // Held in a ref so changing the fetcher identity every render — which it does,
  // being an inline closure — cannot retrigger the effect.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(async (isRefresh: boolean) => {
    controllerRef.current?.abort();

    const controller = new AbortController();
    controllerRef.current = controller;

    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError(null);
    setForbidden(false);

    try {
      const result = await fetcherRef.current(controller.signal);
      if (!mountedRef.current || controller.signal.aborted) return;
      setData(result);
    } catch (err) {
      if (!mountedRef.current || controller.signal.aborted) return;

      if (err instanceof CrmApiError && err.isForbidden) {
        // Expected under row-level scoping — not an error to shout about.
        setForbidden(true);
      } else {
        setError(err instanceof Error ? err.message : 'Request failed.');
      }
    } finally {
      if (mountedRef.current && !controller.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void run(false);

    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const refetch = useCallback(() => {
    void run(true);
  }, [run]);

  return { data, loading, error, forbidden, refetch, refreshing };
}
