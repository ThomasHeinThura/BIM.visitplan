import type {
  AuthUser,
  LoginResponse,
  VisitPlan,
  VisitPlanDraft,
  VisitPlanListResponse,
  VisitPlanPermissions,
} from '../types';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH';
  token?: string;
  body?: Record<string, unknown>;
};

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export async function login(baseUrl: string, email: string, password: string): Promise<LoginResponse> {
  const response = await requestJson<{ data: LoginResponse }>(baseUrl, '/api/auth/login', {
    method: 'POST',
    body: {
      email,
      password,
      device_name: 'bim-visitplan-app',
    },
  });

  return response.data;
}

export async function getMe(baseUrl: string, token: string): Promise<{
  data: AuthUser;
  visit_plan_permissions?: VisitPlanPermissions;
}> {
  return requestJson(baseUrl, '/api/auth/me', { token });
}

export async function listVisitPlans(
  baseUrl: string,
  token: string,
  params: Record<string, string | number | undefined>,
): Promise<VisitPlanListResponse> {
  return requestJson(baseUrl, `/api/v1/visit-plans${toQueryString(params)}`, { token });
}

export async function getVisitPlan(
  baseUrl: string,
  token: string,
  visitPlanId: number,
): Promise<{ data: VisitPlan }> {
  return requestJson(baseUrl, `/api/v1/visit-plans/${visitPlanId}`, { token });
}

export async function createVisitPlan(
  baseUrl: string,
  token: string,
  draft: VisitPlanDraft,
): Promise<{ data: VisitPlan }> {
  return requestJson(baseUrl, '/api/v1/visit-plans', {
    method: 'POST',
    token,
    body: draft as unknown as Record<string, unknown>,
  });
}

export async function updateVisitPlan(
  baseUrl: string,
  token: string,
  visitPlanId: number,
  draft: VisitPlanDraft,
): Promise<{ data: VisitPlan }> {
  return requestJson(baseUrl, `/api/v1/visit-plans/${visitPlanId}`, {
    method: 'PUT',
    token,
    body: draft as unknown as Record<string, unknown>,
  });
}

export async function updateVisitPlanStatus(
  baseUrl: string,
  token: string,
  visitPlanId: number,
  status: number,
): Promise<{ data: VisitPlan }> {
  return requestJson(baseUrl, `/api/v1/visit-plans/${visitPlanId}/status`, {
    method: 'PATCH',
    token,
    body: { status },
  });
}

export async function listResource(
  baseUrl: string,
  token: string,
  resource: string,
  perPage = 50,
): Promise<Record<string, unknown>[]> {
  const response = await requestJson<{ data: Record<string, unknown>[] }>(
    baseUrl,
    `/api/v1/${resource}?per_page=${perPage}`,
    { token },
  );

  return response.data;
}

async function requestJson<T>(baseUrl: string, path: string, options: RequestOptions = {}): Promise<T> {
  const url = `${sanitizeBaseUrl(baseUrl)}${path}`;
  let response: Response;

  try {
    response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (error) {
    throw new ApiError(extractNetworkErrorMessage(error, url), 0, error);
  }

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    throw new ApiError(extractErrorMessage(payload, response.status), response.status, payload);
  }

  return payload as T;
}

function sanitizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/$/, '');
}

function extractErrorMessage(payload: unknown, status: number) {
  if (payload && typeof payload === 'object') {
    const message = Reflect.get(payload, 'message');
    if (typeof message === 'string' && message.trim()) {
      const errors = Reflect.get(payload, 'errors');
      if (errors && typeof errors === 'object') {
        const firstError = Object.values(errors as Record<string, unknown[]>)[0]?.[0];
        if (typeof firstError === 'string') {
          return `${message} ${firstError}`;
        }
      }
      return message;
    }
  }

  if (typeof payload === 'string' && payload.trim()) {
    return payload;
  }

  return `Request failed with status ${status}.`;
}

function extractNetworkErrorMessage(error: unknown, url: string) {
  if (error instanceof Error) {
    if (error.message === 'Failed to fetch') {
      return `Network request failed for ${url}. If you are using web, this usually means the CRM API is blocking the browser origin with CORS or the HTTPS certificate is not trusted by the browser.`;
    }

    return error.message;
  }

  return `Network request failed for ${url}.`;
}

function toQueryString(params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === '') {
      return;
    }

    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}