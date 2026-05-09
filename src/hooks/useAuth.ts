/**
 * useAuth.ts — Microsoft Entra ID authentication hook
 *
 * Manages the full auth lifecycle:
 *   1. Restore session from secure storage on mount
 *   2. Open Microsoft login browser (PKCE OAuth)
 *   3. Exchange code → tokens → Cockpit user lookup
 *   4. Persist session, expose user + role to the app
 *   5. Logout / clear session
 *
 * Usage in App.tsx or a root component:
 *   const { status, user, login, logout, error } = useAuth();
 */

import { useCallback, useEffect, useReducer } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import {
  ENTRA_DISCOVERY,
  ENTRA_REDIRECT_URI,
  ENTRA_SCOPES,
  handleAuthCode,
  logout as authLogout,
  restoreSession,
  createAccountRequest,
} from '../lib/auth';
import { ENTRA_CLIENT_ID } from '../config';
import type { CockpitUser } from '../types';

// Required for expo-auth-session to close the browser after redirect
WebBrowser.maybeCompleteAuthSession();

// ─── State machine ──────────────────────────────────────────────────────────

type AuthStatus =
  | 'restoring'      // Checking secure storage on app launch
  | 'unauthenticated' // No session, show login
  | 'signing_in'     // Browser open / code exchange in progress
  | 'authenticated'  // User loaded, session active
  | 'not_registered' // MS login succeeded but no Cockpit account
  | 'inactive'       // Account exists but deactivated
  | 'error';         // Network or unexpected error

type AuthState = {
  status: AuthStatus;
  user: CockpitUser | null;
  error: string | null;
  /** Data for pending account creation (not_registered state) */
  pendingEmail?: string;
  pendingName?: string;
  pendingMsToken?: string;
  createAccountLoading?: boolean;
};

type AuthAction =
  | { type: 'RESTORE_START' }
  | { type: 'RESTORE_SUCCESS'; user: CockpitUser }
  | { type: 'RESTORE_EMPTY' }
  | { type: 'SIGN_IN_START' }
  | { type: 'SIGN_IN_SUCCESS'; user: CockpitUser }
  | { type: 'SIGN_IN_FAIL'; reason: 'not_registered' | 'inactive' | 'cancelled' | 'error'; message?: string; pendingEmail?: string; pendingName?: string; pendingMsToken?: string }
  | { type: 'CREATE_ACCOUNT_START' }
  | { type: 'CREATE_ACCOUNT_SUCCESS'; user: CockpitUser }
  | { type: 'CREATE_ACCOUNT_FAIL'; message: string }
  | { type: 'LOGOUT' };

const initialState: AuthState = { status: 'restoring', user: null, error: null };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'RESTORE_START':
      return { status: 'restoring', user: null, error: null };
    case 'RESTORE_SUCCESS':
      return { status: 'authenticated', user: action.user, error: null };
    case 'RESTORE_EMPTY':
      return { status: 'unauthenticated', user: null, error: null };
    case 'SIGN_IN_START':
      return { ...state, status: 'signing_in', error: null };
    case 'SIGN_IN_SUCCESS':
      return { status: 'authenticated', user: action.user, error: null };
    case 'SIGN_IN_FAIL':
      return {
        status: action.reason === 'not_registered' ? 'not_registered'
          : action.reason === 'inactive' ? 'inactive'
          : action.reason === 'cancelled' ? 'unauthenticated'
          : 'error',
        user: null,
        error: action.message ?? null,
        pendingEmail: action.pendingEmail,
        pendingName: action.pendingName,
        pendingMsToken: action.pendingMsToken,
      };
    case 'CREATE_ACCOUNT_START':
      return { ...state, createAccountLoading: true, error: null };
    case 'CREATE_ACCOUNT_SUCCESS':
      return { status: 'authenticated', user: action.user, error: null };
    case 'CREATE_ACCOUNT_FAIL':
      return { ...state, createAccountLoading: false, error: action.message };
    case 'LOGOUT':
      return { status: 'unauthenticated', user: null, error: null };
    default:
      return state;
  }
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useAuth() {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // PKCE auth request — created once, reused per login attempt
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: ENTRA_CLIENT_ID,
      scopes: ENTRA_SCOPES,
      redirectUri: ENTRA_REDIRECT_URI,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      extraParams: {
        prompt: 'select_account', // Always show account picker
      },
    },
    ENTRA_DISCOVERY,
  );

  // 1. Restore session on mount
  useEffect(() => {
    dispatch({ type: 'RESTORE_START' });
    restoreSession().then((user) => {
      if (user) {
        dispatch({ type: 'RESTORE_SUCCESS', user });
      } else {
        dispatch({ type: 'RESTORE_EMPTY' });
      }
    });
  }, []);

  // 2. Handle redirect from Microsoft after browser closes
  useEffect(() => {
    if (!response) return;

    if (response.type === 'cancel' || response.type === 'dismiss') {
      dispatch({ type: 'SIGN_IN_FAIL', reason: 'cancelled' });
      return;
    }

    if (response.type === 'error') {
      dispatch({
        type: 'SIGN_IN_FAIL',
        reason: 'error',
        message: response.error?.message ?? 'Microsoft login failed.',
      });
      return;
    }

    if (response.type === 'success') {
      const { code } = response.params;
      const codeVerifier = request?.codeVerifier;
      if (!code || !codeVerifier) {
        dispatch({ type: 'SIGN_IN_FAIL', reason: 'error', message: 'Missing auth code or PKCE verifier.' });
        return;
      }

      handleAuthCode(code, codeVerifier).then((result) => {
        if (result.success) {
          console.log('[useAuth] Auth success:', result.user.name);
          dispatch({ type: 'SIGN_IN_SUCCESS', user: result.user });
        } else {
          console.log('[useAuth] Auth failed:', { reason: result.reason, message: result.message, pending: { email: result.pendingEmail, name: result.pendingName } });
          dispatch({
            type: 'SIGN_IN_FAIL',
            reason: result.reason,
            message: result.message,
            pendingEmail: result.pendingEmail,
            pendingName: result.pendingName,
            pendingMsToken: result.pendingMsToken, // Store access token for account creation
          });
        }
      }).catch((err) => {
        console.error('[useAuth] Error during auth code exchange:', err);
        dispatch({
          type: 'SIGN_IN_FAIL',
          reason: 'error',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      });
    }
  }, [response, request]);

  // 3. Trigger login — opens Microsoft browser
  const login = useCallback(async () => {
    dispatch({ type: 'SIGN_IN_START' });
    await promptAsync();
  }, [promptAsync]);

  // 4. Logout
  const logout = useCallback(async () => {
    await authLogout();
    dispatch({ type: 'LOGOUT' });
  }, []);

  // 5. Create account for new users (called from LoginScreen when user clicks "Create Account")
  const createPendingAccount = useCallback(async () => {
    if (!state.pendingEmail || !state.pendingName || !state.pendingMsToken) {
      dispatch({
        type: 'CREATE_ACCOUNT_FAIL',
        message: 'Missing pending account data.',
      });
      return;
    }

    dispatch({ type: 'CREATE_ACCOUNT_START' });

    const result = await createAccountRequest(
      state.pendingEmail,
      state.pendingName,
      state.pendingMsToken,
    );

    if (result.success) {
      dispatch({ type: 'CREATE_ACCOUNT_SUCCESS', user: result.user });
    } else {
      dispatch({ type: 'CREATE_ACCOUNT_FAIL', message: result.message ?? 'Account creation failed.' });
    }
  }, [state.pendingEmail, state.pendingName, state.pendingMsToken]);

  return {
    /** Current auth status */
    status: state.status,
    /** Authenticated Cockpit user (null if not signed in) */
    user: state.user,
    /** User's role shorthand */
    role: state.user?.role ?? null,
    /** Error message for display */
    error: state.error,
    /** Whether the auth request is ready to prompt */
    loginReady: !!request,
    /** Open Microsoft login browser */
    login,
    /** Clear session and return to login screen */
    logout,
    /** Pending account data (for not_registered state) */
    pendingEmail: state.pendingEmail,
    pendingName: state.pendingName,
    /** Create account for pending user */
    createPendingAccount,
    /** Account creation loading state */
    createAccountLoading: state.createAccountLoading ?? false,
  };
}

export type UseAuthReturn = ReturnType<typeof useAuth>;
