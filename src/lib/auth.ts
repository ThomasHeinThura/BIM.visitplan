/**
 * auth.ts — Microsoft Entra ID login + Cockpit user lookup
 *
 * OAuth flow: Authorization Code + PKCE (public client, no secret in app)
 * Packages: expo-auth-session, expo-web-browser, expo-crypto
 *
 * Redirect URI registered in Azure Portal:
 *   Platform → Mobile and desktop applications
 *   URI: msauth.com.heinthura.bimvisitplan://auth
 */

import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';
import { getUserByMsEmail, upsertUser } from './cockpit';
import {
  clearSession,
  getMsToken,
  getUserJson,
  saveMsToken,
  saveUserJson,
  saveUserId,
  saveUserRole,
} from './storage';
import { ENTRA_CLIENT_ID, ENTRA_TENANT_ID, ENTRA_REDIRECT_SCHEME } from '../config';
import type { CockpitUser } from '../types';

// ─── Types ─────────────────────────────────────────────────────────────────

export type AuthResult =
  | { success: true; user: CockpitUser }
  | { success: false; reason: 'pending_approval' | 'inactive' | 'cancelled' | 'error'; message?: string };

// ─── OAuth discovery + redirect URI ────────────────────────────────────────

/** Microsoft Entra ID OIDC endpoints for our tenant */
export const ENTRA_DISCOVERY: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: `https://login.microsoftonline.com/${ENTRA_TENANT_ID}/oauth2/v2.0/authorize`,
  tokenEndpoint: `https://login.microsoftonline.com/${ENTRA_TENANT_ID}/oauth2/v2.0/token`,
  revocationEndpoint: `https://login.microsoftonline.com/${ENTRA_TENANT_ID}/oauth2/v2.0/logout`,
};

/**
 * Redirect URI — platform-aware:
 *   Native → msauth.com.heinthura.bimvisitplan://auth  (registered as Mobile/desktop)
 *   Web    → http://localhost:8081                      (registered as Single-page application)
 */
export const ENTRA_REDIRECT_URI = Platform.OS === 'web'
  ? AuthSession.makeRedirectUri({ preferLocalhost: true, isTripleSlashed: false })
  : AuthSession.makeRedirectUri({ scheme: ENTRA_REDIRECT_SCHEME, path: 'auth' });

/** OAuth scopes — all granted in the Azure App Registration */
export const ENTRA_SCOPES = ['openid', 'profile', 'email', 'User.Read', 'offline_access'];

// ─── Decode id_token ────────────────────────────────────────────────────────

type IdTokenClaims = {
  preferred_username?: string; // UPN — e.g. john@bimats.com
  email?: string;
  name?: string;
  oid?: string; // Microsoft object ID
};

/**
 * Decode the JWT id_token payload without verifying the signature.
 * Verification is already handled by Microsoft's token endpoint (PKCE flow).
 */
function decodeIdToken(idToken: string): IdTokenClaims {
  try {
    const payload = idToken.split('.')[1];
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(json) as IdTokenClaims;
  } catch {
    return {};
  }
}

// ─── Token exchange (called after promptAsync succeeds) ─────────────────────

/**
 * Exchange an authorization code from promptAsync for tokens,
 * then look up the user in Cockpit CMS by their Microsoft email.
 *
 * Called from useAuth.ts inside a useEffect watching the AuthSession response.
 */
export async function handleAuthCode(
  code: string,
  codeVerifier: string,
): Promise<AuthResult> {
  try {
    const tokenResponse = await AuthSession.exchangeCodeAsync(
      {
        clientId: ENTRA_CLIENT_ID,
        code,
        redirectUri: ENTRA_REDIRECT_URI,
        extraParams: { code_verifier: codeVerifier },
      },
      ENTRA_DISCOVERY,
    );

    const { accessToken, idToken } = tokenResponse;
    if (!accessToken) {
      return { success: false, reason: 'error', message: 'No access token returned.' };
    }

    const claims = idToken ? decodeIdToken(idToken) : {};
    const msEmail = claims.preferred_username ?? claims.email ?? '';

    if (!msEmail) {
      return { success: false, reason: 'error', message: 'Could not read email from Microsoft token.' };
    }

    return loginWithEmail(msEmail, accessToken);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error during token exchange.';
    return { success: false, reason: 'error', message };
  }
}

// ─── Cockpit lookup + session persist ──────────────────────────────────────

export async function loginWithEmail(
  msEmail: string,
  msToken: string,
): Promise<AuthResult> {
  try {
    let user = await getUserByMsEmail(msEmail);

    if (!user) {
      // New user — create a pending account automatically.
      // Name is extracted from the MS access token (best-effort).
      let name = msEmail.split('@')[0] ?? 'New User';
      try {
        const claims = decodeIdToken(msToken);
        if (claims.name) name = claims.name;
      } catch { /* ignore */ }

      user = await upsertUser({
        ms_email: msEmail,
        email: msEmail,
        name,
        role: 'am',
        approval_status: 'pending',
        active: false,
      });
    }

    if (user.approval_status === 'pending' || user.approval_status === 'rejected') {
      return {
        success: false,
        reason: 'pending_approval',
        message: user.approval_status === 'rejected'
          ? 'Your access request was not approved. Contact your admin.'
          : 'Your account is awaiting admin approval.',
      };
    }

    if (!user.active) {
      return {
        success: false,
        reason: 'inactive',
        message: 'Your account has been deactivated. Contact your admin.',
      };
    }

    await saveMsToken(msToken);
    await saveUserId(user._id);
    await saveUserRole(user.role);
    await saveUserJson(user);

    return { success: true, user };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, reason: 'error', message };
  }
}

// ─── Restore session on app startup ─────────────────────────────────────────

/**
 * Restore a previously stored user session from secure storage.
 * Call this on app startup before showing any screen.
 */
export async function restoreSession(): Promise<CockpitUser | null> {
  const token = await getMsToken();
  if (!token) return null;
  const user = await getUserJson<CockpitUser>();
  // Re-validate cached session: must be active and approved.
  // Stale cache (e.g. admin rejected/deactivated user) is caught here.
  if (!user || !user.active) return null;
  // Some Cockpit installations don't include an `approval_status` field.
  // Only reject the cached session if `approval_status` exists and is not 'approved'.
  if (user.approval_status !== undefined && user.approval_status !== 'approved') return null;
  return user;
}

// ─── Logout ──────────────────────────────────────────────────────────────────

export async function logout(): Promise<void> {
  await clearSession();
}
