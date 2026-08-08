/**
 * Authentication against bim-crm.
 *
 * Two ways in:
 *   1. signInWithEntra  — the real flow. The app completes the Entra PKCE exchange
 *      itself (src/lib/auth.ts) and posts the resulting id_token here; the server
 *      verifies it against Entra's JWKS and returns a Sanctum token.
 *   2. signInWithDevRole — LOCAL DEVELOPMENT ONLY. Mirrors the CRM's existing web
 *      /auth/bypass/{role}. Only works when the backend runs with APP_ENV=local and
 *      AUTH_BYPASS_ENABLED=true; it 404s anywhere else. It exists because the Entra
 *      mobile app registration does not exist yet, and without it no mobile client
 *      work can be exercised against a real backend.
 */

import { request } from './client';
import { saveSession, clearSession } from './session';

export type CrmUser = {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  last_login_at: string | null;
  roles: string[];
  /** Flat list — the client gates UI on these rather than re-deriving from roles. */
  permissions: string[];
  sectors: { id: number; name: string; color: string | null }[];
};

type SessionResponse = {
  data: {
    token: string;
    expires_at: string | null;
    user: CrmUser;
  };
};

export async function signInWithEntra(idToken: string, deviceName = 'bim-visitplan'): Promise<CrmUser> {
  const response = await request<SessionResponse>(
    '/api/auth/entra',
    { method: 'POST', anonymous: true, body: { id_token: idToken, device_name: deviceName } },
  );

  await saveSession(response.data.token, response.data.expires_at);

  return response.data.user;
}

export async function signInWithDevRole(role: string, deviceName = 'local-dev'): Promise<CrmUser> {
  const response = await request<SessionResponse>(
    `/api/auth/dev-token/${encodeURIComponent(role)}`,
    { method: 'POST', anonymous: true, body: { device_name: deviceName } },
  );

  await saveSession(response.data.token, response.data.expires_at);

  return response.data.user;
}

export async function fetchMe(): Promise<CrmUser> {
  const response = await request<{ data: CrmUser }>('/api/auth/me');

  return response.data;
}

export async function signOut(): Promise<void> {
  try {
    await request('/api/auth/logout', { method: 'POST' });
  } finally {
    // Clear locally even if the server call fails — otherwise a network blip leaves
    // the user apparently signed in with a token they cannot use.
    await clearSession();
  }
}

/**
 * A user with no meaningful permissions is the state every new SSO account lands in.
 * It is a normal state with its own screen, not an error.
 */
export function isPendingApproval(user: CrmUser): boolean {
  return user.permissions.length === 0 || (user.roles.length === 1 && user.roles[0] === 'employee');
}
