/**
 * HTTP client for the bim-crm API.
 *
 * Replaces lib/cockpit.ts as the single data source. Deliberately keeps the two
 * envelope conventions the old lib/api.ts already assumed, because they match
 * Laravel's defaults exactly and the server was built to them:
 *   - success (paginated): { data, meta }
 *   - failure:             { message, errors: { field: [msg, ...] } }
 */

import { CRM_API_URL } from '../../config';
import { getToken, clearSession } from './session';

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Skip the Authorization header — only the token-issuing endpoints need this. */
  anonymous?: boolean;
  signal?: AbortSignal;
};

export class CrmApiError extends Error {
  status: number;

  /** Field-level validation messages, keyed by field name. */
  fieldErrors: Record<string, string[]>;

  constructor(message: string, status: number, fieldErrors: Record<string, string[]> = {}) {
    super(message);
    this.name = 'CrmApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  /** 403 is a normal outcome under row-level scoping, not a crash. */
  get isForbidden() {
    return this.status === 403;
  }

  get isUnauthenticated() {
    return this.status === 401;
  }

  /** status 0 means the request never reached the server. */
  get isNetworkError() {
    return this.status === 0;
  }
}

function buildUrl(path: string, query?: Record<string, string | number | boolean | undefined>) {
  const base = CRM_API_URL.replace(/\/$/, '');
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;

  if (!query) return url;

  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === '') return;
    params.set(key, String(value));
  });

  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
  query?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  if (!CRM_API_URL) {
    throw new CrmApiError(
      'EXPO_PUBLIC_CRM_API_URL is not set. Copy .env.example to .env and point it at your bim-crm server.',
      0,
    );
  }

  const token = options.anonymous ? null : await getToken();

  let response: Response;

  try {
    response = await fetch(buildUrl(path, query), {
      method: options.method ?? 'GET',
      signal: options.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch (error) {
    // On web this is usually CORS or an unreachable host rather than a genuine
    // offline state, and those look identical to fetch — so say both.
    throw new CrmApiError(
      `Could not reach the CRM at ${CRM_API_URL}. It may be offline, or blocking this origin via CORS.`,
      0,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text();

  if (!response.ok) {
    // An expired or revoked token must not leave a stale session behind, or every
    // subsequent request retries with a credential that can never work again.
    if (response.status === 401) {
      await clearSession();
    }

    throw new CrmApiError(
      extractMessage(payload, response.status),
      response.status,
      extractFieldErrors(payload),
    );
  }

  return payload as T;
}

function extractMessage(payload: unknown, status: number): string {
  if (payload && typeof payload === 'object') {
    const message = (payload as Record<string, unknown>).message;
    if (typeof message === 'string' && message.trim()) return message;
  }

  if (typeof payload === 'string' && payload.trim()) return payload;

  if (status === 403) return 'You do not have access to this.';
  if (status === 401) return 'Your session has expired. Please sign in again.';

  return `Request failed (${status}).`;
}

function extractFieldErrors(payload: unknown): Record<string, string[]> {
  if (!payload || typeof payload !== 'object') return {};

  const errors = (payload as Record<string, unknown>).errors;
  if (!errors || typeof errors !== 'object') return {};

  const result: Record<string, string[]> = {};
  Object.entries(errors as Record<string, unknown>).forEach(([field, messages]) => {
    if (Array.isArray(messages)) {
      result[field] = messages.filter((m): m is string => typeof m === 'string');
    }
  });

  return result;
}
