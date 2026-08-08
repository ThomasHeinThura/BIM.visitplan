/**
 * Sanctum token storage.
 *
 * The token goes in expo-secure-store (iOS Keychain / Android Keystore), never
 * AsyncStorage — AsyncStorage is plain, world-readable-by-the-app storage and a
 * bearer token is a full credential.
 *
 * SecureStore has no web implementation, so on web this falls back to localStorage.
 * That is acceptable for the mobile-web build during development but is NOT
 * equivalent security: anything running in the page can read localStorage. Native
 * builds, which are what ship, use the platform keystore.
 */

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'bim.crm.token';
const EXPIRY_KEY = 'bim.crm.token_expires_at';

const isWeb = Platform.OS === 'web';

async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    return globalThis.localStorage?.getItem(key) ?? null;
  }
  return SecureStore.getItemAsync(key);
}

async function removeItem(key: string): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function saveSession(token: string, expiresAt: string | null): Promise<void> {
  await setItem(TOKEN_KEY, token);
  if (expiresAt) {
    await setItem(EXPIRY_KEY, expiresAt);
  } else {
    await removeItem(EXPIRY_KEY);
  }
}

export async function getToken(): Promise<string | null> {
  const token = await getItem(TOKEN_KEY);
  if (!token) return null;

  // Discard a token we already know is expired rather than spending a round trip
  // to be told 401. The server remains the authority; this is just an optimisation.
  const expiresAt = await getItem(EXPIRY_KEY);
  if (expiresAt && Date.parse(expiresAt) <= Date.now()) {
    await clearSession();
    return null;
  }

  return token;
}

export async function clearSession(): Promise<void> {
  await removeItem(TOKEN_KEY);
  await removeItem(EXPIRY_KEY);
}
