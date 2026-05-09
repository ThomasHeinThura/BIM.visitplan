import React, { createContext, useCallback, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';

// ─── Token definitions ────────────────────────────────────────────────────────

const light = {
  // Background
  bg: '#F5F5F5',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F4F8',
  // Text
  text: '#111827',
  textSecondary: '#6B7280',
  textInverse: '#FFFFFF',
  // Brand
  primary: '#1C3F5E',
  primaryLight: '#2D5A8E',
  accent: '#E8A838',
  // Status
  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',
  info: '#2563EB',
  // Border / Divider
  border: '#E5E7EB',
  divider: '#F3F4F6',
  // Status badges (client status)
  statusActive: '#D1FAE5',
  statusActiveText: '#065F46',
  statusHold: '#FEF3C7',
  statusHoldText: '#92400E',
  statusInactive: '#F3F4F6',
  statusInactiveText: '#4B5563',
  statusChurned: '#FEE2E2',
  statusChurnedText: '#991B1B',
  statusProspect: '#EDE9FE',
  statusProspectText: '#5B21B6',
  // Navigation
  navBg: '#1C3F5E',
  navText: '#94A3B8',
  navTextActive: '#FFFFFF',
  navIndicator: '#E8A838',
  // Cards
  cardShadow: 'rgba(0,0,0,0.06)',
  // Input
  inputBg: '#F9FAFB',
  inputBorder: '#D1D5DB',
  inputFocus: '#1C3F5E',
};

const dark: typeof light = {
  bg: '#0F172A',
  surface: '#1E293B',
  surfaceAlt: '#162032',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textInverse: '#0F172A',
  primary: '#3B82F6',
  primaryLight: '#60A5FA',
  accent: '#F59E0B',
  success: '#22C55E',
  warning: '#FBBF24',
  error: '#F87171',
  info: '#60A5FA',
  border: '#334155',
  divider: '#1E293B',
  statusActive: '#064E3B',
  statusActiveText: '#6EE7B7',
  statusHold: '#451A03',
  statusHoldText: '#FCD34D',
  statusInactive: '#1E293B',
  statusInactiveText: '#94A3B8',
  statusChurned: '#450A0A',
  statusChurnedText: '#FCA5A5',
  statusProspect: '#2E1065',
  statusProspectText: '#C4B5FD',
  navBg: '#0F172A',
  navText: '#64748B',
  navTextActive: '#F1F5F9',
  navIndicator: '#F59E0B',
  cardShadow: 'rgba(0,0,0,0.4)',
  inputBg: '#1E293B',
  inputBorder: '#475569',
  inputFocus: '#3B82F6',
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
