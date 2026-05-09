import React, { createContext, useCallback, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';

// ─── Token definitions ────────────────────────────────────────────────────────

const light = {
  // Background
  bg: '#f4f5f7',
  surface: '#ffffff',
  surfaceAlt: '#f9fafb',
  // Text
  text: '#0f1428',
  textSecondary: '#5c6378',
  textInverse: '#ffffff',
  // Brand — teal primary matching reference design
  primary: '#0a8a7c',
  primaryLight: '#e0f5f3',
  accent: '#f59e0b',
  // Status
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#0ea5e9',
  // Border / Divider
  border: 'rgba(15,20,40,0.1)',
  divider: 'rgba(15,20,40,0.07)',
  // Status badges (client status)
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
  // Navigation
  navBg: '#ffffff',
  navText: '#9ba3b8',
  navTextActive: '#0a8a7c',
  navIndicator: '#0a8a7c',
  // Cards
  cardShadow: 'rgba(15,20,40,0.08)',
  // Input
  inputBg: '#ffffff',
  inputBorder: 'rgba(15,20,40,0.1)',
  inputFocus: '#0a8a7c',
};

const dark: typeof light = {
  bg: '#0d1117',
  surface: '#161b27',
  surfaceAlt: '#1e2536',
  text: '#e8eaf0',
  textSecondary: '#8892a4',
  textInverse: '#0d1117',
  primary: '#14c0ae',
  primaryLight: 'rgba(20,192,174,0.15)',
  accent: '#fbbf24',
  success: '#4ade80',
  warning: '#fbbf24',
  error: '#f87171',
  info: '#38bdf8',
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
};

export type Theme = typeof light;
export type ThemeMode = 'light' | 'dark' | 'system';

// ─── Context ──────────────────────────────────────────────────────────────────

type ThemeContextValue = {
  theme: Theme;
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: light,
  mode: 'system',
  isDark: false,
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');

  const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');
  const theme = isDark ? dark : light;

  const handleSetMode = useCallback((m: ThemeMode) => setMode(m), []);

  return (
    <ThemeContext.Provider value={{ theme, mode, isDark, setMode: handleSetMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
