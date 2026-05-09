import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useColorScheme, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Token definitions (mirror visitplan-v2.html) ────────────────────────────

const light = {
  bg: '#f4f5f7',
  surface: '#ffffff',
  surfaceAlt: '#f9fafb',
  surfaceOffset: '#eef0f3',
  text: '#0f1428',
  textSecondary: '#5c6378',
  textFaint: '#9ba3b8',
  textInverse: '#ffffff',
  primary: '#0a8a7c',
  primaryHover: '#077068',
  primaryLight: '#e0f5f3',
  accent: '#f59e0b',
  success: '#22c55e',
  successLight: '#dcfce7',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  error: '#ef4444',
  errorLight: '#fee2e2',
  info: '#0ea5e9',
  purple: '#8b5cf6',
  purpleLight: '#ede9fe',
  orange: '#f97316',
  orangeLight: '#ffedd5',
  border: 'rgba(15,20,40,0.10)',
  divider: 'rgba(15,20,40,0.07)',
  statusActive: '#dcfce7',
  statusActiveText: '#15803d',
  statusHold: '#fef3c7',
  statusHoldText: '#92400e',
  statusInactive: '#eef0f3',
  statusInactiveText: '#5c6378',
  statusChurned: '#fee2e2',
  statusChurnedText: '#991b1b',
  statusProspect: '#ede9fe',
  statusProspectText: '#5b21b6',
  navBg: '#ffffff',
  navText: '#9ba3b8',
  navTextActive: '#0a8a7c',
  navIndicator: '#0a8a7c',
  cardShadow: 'rgba(15,20,40,0.08)',
  inputBg: '#ffffff',
  inputBorder: 'rgba(15,20,40,0.10)',
  inputFocus: '#0a8a7c',
  loginBgFrom: '#e8f5f4',
  loginBgVia: '#f4f5f7',
  loginBgTo: '#eaf4f3',
};

const dark: typeof light = {
  bg: '#0d1117',
  surface: '#161b27',
  surfaceAlt: '#1e2536',
  surfaceOffset: '#252d40',
  text: '#e8eaf0',
  textSecondary: '#8892a4',
  textFaint: '#4a5568',
  textInverse: '#0d1117',
  primary: '#14c0ae',
  primaryHover: '#0fa898',
  primaryLight: 'rgba(20,192,174,0.15)',
  accent: '#fbbf24',
  success: '#4ade80',
  successLight: 'rgba(74,222,128,0.15)',
  warning: '#fbbf24',
  warningLight: 'rgba(251,191,36,0.15)',
  error: '#f87171',
  errorLight: 'rgba(248,113,113,0.15)',
  info: '#38bdf8',
  purple: '#a78bfa',
  purpleLight: 'rgba(167,139,250,0.15)',
  orange: '#fb923c',
  orangeLight: 'rgba(249,115,60,0.15)',
  border: 'rgba(255,255,255,0.08)',
  divider: 'rgba(255,255,255,0.05)',
  statusActive: 'rgba(74,222,128,0.15)',
  statusActiveText: '#4ade80',
  statusHold: 'rgba(251,191,36,0.15)',
  statusHoldText: '#fbbf24',
  statusInactive: 'rgba(255,255,255,0.06)',
  statusInactiveText: '#8892a4',
  statusChurned: 'rgba(248,113,113,0.15)',
  statusChurnedText: '#f87171',
  statusProspect: 'rgba(167,139,250,0.15)',
  statusProspectText: '#a78bfa',
  navBg: '#161b27',
  navText: '#4a5568',
  navTextActive: '#14c0ae',
  navIndicator: '#14c0ae',
  cardShadow: 'rgba(0,0,0,0.4)',
  inputBg: '#1e2536',
  inputBorder: 'rgba(255,255,255,0.08)',
  inputFocus: '#14c0ae',
  loginBgFrom: '#0a1628',
  loginBgVia: '#0d1117',
  loginBgTo: '#071f1c',
};

export const radii = { sm: 6, md: 10, lg: 16, xl: 24, full: 9999 };
export const fonts = {
  display: Platform.select({
    ios: 'System',
    android: 'sans-serif-medium',
    default: '"Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  }) as string,
  body: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  }) as string,
};

export type Theme = typeof light;
export type ThemeMode = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  theme: Theme;
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: dark,
  mode: 'dark',
  isDark: true,
  setMode: () => {},
  toggle: () => {},
});

const STORAGE_KEY = 'visitplan.theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  // Default to dark to match HTML prototype
  const [mode, setMode] = useState<ThemeMode>('dark');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === 'light' || v === 'dark' || v === 'system') setMode(v);
    });
  }, []);

  const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');
  const theme = isDark ? dark : light;

  const handleSetMode = useCallback((m: ThemeMode) => {
    setMode(m);
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
  }, []);

  const toggle = useCallback(() => {
    handleSetMode(isDark ? 'light' : 'dark');
  }, [isDark, handleSetMode]);

  return (
    <ThemeContext.Provider value={{ theme, mode, isDark, setMode: handleSetMode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
