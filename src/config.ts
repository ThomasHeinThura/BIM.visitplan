/**
 * config.ts — All values come from environment variables.
 *
 * Copy .env.example → .env and fill in your values before running.
 * EXPO_PUBLIC_* vars are inlined at build time by the Expo bundler.
 * They are NOT secret at runtime in the JS bundle, but keeping them out
 * of source control prevents accidental exposure via git history.
 *
 * ⚠️  Never add hardcoded fallback secrets here — this file is open source.
 */

const publicEnv = {
  EXPO_PUBLIC_COCKPIT_API_URL: process.env.EXPO_PUBLIC_COCKPIT_API_URL,
  EXPO_PUBLIC_COCKPIT_API_TOKEN: process.env.EXPO_PUBLIC_COCKPIT_API_TOKEN,
  EXPO_PUBLIC_ENTRA_CLIENT_ID: process.env.EXPO_PUBLIC_ENTRA_CLIENT_ID,
  EXPO_PUBLIC_ENTRA_TENANT_ID: process.env.EXPO_PUBLIC_ENTRA_TENANT_ID,
  EXPO_PUBLIC_ENTRA_REDIRECT_SCHEME: process.env.EXPO_PUBLIC_ENTRA_REDIRECT_SCHEME,
} as const;

function requireEnv(key: keyof typeof publicEnv): string {
  const value = publicEnv[key];
  if (!value && __DEV__) {
    console.warn(`[config] Missing env var: ${key}. Add it to your .env file.`);
  }
  return value ?? '';
}

// ─── Cockpit CMS ─────────────────────────────────────────────────────────────
export const COCKPIT_API_URL = requireEnv('EXPO_PUBLIC_COCKPIT_API_URL');
export const COCKPIT_API_TOKEN = requireEnv('EXPO_PUBLIC_COCKPIT_API_TOKEN');

// ─── Microsoft Entra ID (Azure App Registration) ─────────────────────────────
// Uses PKCE (public client) — NO client secret should ever be in client-side code.
// iOS redirect URI:  msauth.com.bim.visitplan://auth  (Mobile/desktop)
// Web redirect URI:  http://localhost:8081                      (Single-page application)
export const ENTRA_CLIENT_ID = requireEnv('EXPO_PUBLIC_ENTRA_CLIENT_ID');
export const ENTRA_TENANT_ID = requireEnv('EXPO_PUBLIC_ENTRA_TENANT_ID');

// Custom URL scheme registered in app.json — must match Azure redirect URI
export const ENTRA_REDIRECT_SCHEME = requireEnv('EXPO_PUBLIC_ENTRA_REDIRECT_SCHEME');

// ─── Legacy REST API (optional) ──────────────────────────────────────────────
export const DEFAULT_API_BASE_URL =
  (process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://uat-crm.bimats.com:10443').replace(/\/$/, '');