import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// ─── Platform-safe storage (SecureStore on native, localStorage on web) ────

const KEYS = {
  ACCESS_TOKEN: 'visitplan_access_token',
  MS_TOKEN: 'visitplan_ms_token',
  USER_ID: 'visitplan_user_id',
  USER_ROLE: 'visitplan_user_role',
  USER_JSON: 'visitplan_user_json',
} as const;

// Use sessionStorage on web to limit token exposure to the current tab/session.
// sessionStorage is cleared when the tab closes, reducing XSS window vs localStorage.
async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    sessionStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return sessionStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function removeItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    sessionStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

// ─── Auth token storage ───────────────────────────────────────────────────

export async function saveMsToken(token: string): Promise<void> {
  await setItem(KEYS.MS_TOKEN, token);
}

export async function getMsToken(): Promise<string | null> {
  return getItem(KEYS.MS_TOKEN);
}

export async function saveUserId(id: string): Promise<void> {
  await setItem(KEYS.USER_ID, id);
}

export async function getUserId(): Promise<string | null> {
  return getItem(KEYS.USER_ID);
}

export async function saveUserRole(role: string): Promise<void> {
  await setItem(KEYS.USER_ROLE, role);
}

export async function getUserRole(): Promise<string | null> {
  return getItem(KEYS.USER_ROLE);
}

export async function saveUserJson(user: object): Promise<void> {
  await setItem(KEYS.USER_JSON, JSON.stringify(user));
}

export async function getUserJson<T>(): Promise<T | null> {
  const raw = await getItem(KEYS.USER_JSON);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// ─── Clear session ────────────────────────────────────────────────────────

export async function clearSession(): Promise<void> {
  await Promise.all(Object.values(KEYS).map(removeItem));
}
