export const DEFAULT_API_BASE_URL =
  (process.env.EXPO_PUBLIC_API_BASE_URL || 'https://uat-crm.bimats.com:10443').replace(/\/$/, '');

export const COCKPIT_API_URL = 'https://cms.bimats.com/api';
export const COCKPIT_API_TOKEN = 'REDACTED_ROTATE_THIS_TOKEN';

// ─── Microsoft Entra ID (Azure App Registration) ───────────────────────────
// App registration: BIM Visitplan (client ID updated May 2026)
// iOS redirect URI:  msauth.com.heinthura.bimvisitplan://auth  (Mobile/desktop)
// Web redirect URI:  http://localhost:8081                      (Single-page application)
export const ENTRA_CLIENT_ID = '43cd5828-4dcb-4d80-a559-29e588368549';
export const ENTRA_TENANT_ID = '0b3a6bcc-d52e-4a67-a10d-25b777d4c896';

// Custom URL scheme registered in app.json — must match Azure redirect URI
export const ENTRA_REDIRECT_SCHEME = 'msauth.com.heinthura.bimvisitplan';