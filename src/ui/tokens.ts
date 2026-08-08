/**
 * Design tokens.
 *
 * Extends ThemeContext's palette rather than replacing it — that palette carries the
 * brand teal and the light/dark split, and every existing screen reads from it.
 *
 * The organising idea: colour in this app encodes TERRITORY, not decoration. The API
 * returns a colour per sector (Banking blue, Telecom green, Microfinance teal…), and a
 * rep thinks in sectors — so a Banking visit and a Telecom deal should be
 * distinguishable at a glance without reading a word. Sector colour drives card edges,
 * badge tints and avatars throughout. That is why this app is polychrome rather than
 * one-accent-on-dark.
 */

import { Platform, type TextStyle, type ViewStyle } from 'react-native';

import { fonts } from '../context/ThemeContext';

// ─── Type scale ──────────────────────────────────────────────────────────────
//
// Real jumps, not a gentle ramp. The old scale ran 10–20px with everything bunched at
// 12–14, which is what made the UI read as flat: nothing could be more important than
// anything else. Display sizes carry negative tracking because large type set at
// default spacing looks loose.

export const type = {
  hero: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -0.8,
    fontFamily: fonts.display,
  } satisfies TextStyle,

  display: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '700',
    letterSpacing: -0.5,
    fontFamily: fonts.display,
  } satisfies TextStyle,

  title: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
    fontFamily: fonts.display,
  } satisfies TextStyle,

  heading: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: -0.1,
    fontFamily: fonts.display,
  } satisfies TextStyle,

  body: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    fontFamily: fonts.body,
  } satisfies TextStyle,

  bodySm: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '500',
    fontFamily: fonts.body,
  } satisfies TextStyle,

  /** Eyebrows and section labels. Uppercase + wide tracking reads as a system label. */
  micro: {
    fontSize: 10.5,
    lineHeight: 13,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    fontFamily: fonts.body,
  } satisfies TextStyle,

  /** Tabular-ish figures for money and counts. */
  numeric: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
    letterSpacing: -0.2,
    fontFamily: fonts.display,
  } satisfies TextStyle,
};

// ─── Spacing ─────────────────────────────────────────────────────────────────

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 22, xxl: 30 };

// ─── Elevation ───────────────────────────────────────────────────────────────
//
// Three levels so hierarchy is visible without borders doing all the work. On Android
// shadowColor/Opacity are ignored, so elevation carries it; on iOS and web the shadow
// does. Both are set rather than picking one.

export function elevation(level: 0 | 1 | 2 | 3, shadowColor: string): ViewStyle {
  if (level === 0) return {};

  const config = {
    1: { offset: 2, radius: 6, opacity: 0.16, elevation: 2 },
    2: { offset: 6, radius: 14, opacity: 0.22, elevation: 6 },
    3: { offset: 12, radius: 26, opacity: 0.3, elevation: 12 },
  }[level];

  return {
    shadowColor,
    shadowOffset: { width: 0, height: config.offset },
    shadowOpacity: config.opacity,
    shadowRadius: config.radius,
    elevation: config.elevation,
  };
}

// ─── Sector colour ───────────────────────────────────────────────────────────

/**
 * Alpha-blend a hex colour by appending an 8-bit alpha channel.
 *
 * React Native accepts #RRGGBBAA on all three platforms, which keeps tints derived
 * from one source colour rather than hand-picked per sector — nine sectors would
 * otherwise need nine hand-mixed tints, and a tenth added in the CRM would have none.
 */
export function alpha(hex: string, amount: number): string {
  const clean = hex.replace('#', '').slice(0, 6);
  const value = Math.round(Math.min(Math.max(amount, 0), 1) * 255);

  return `#${clean}${value.toString(16).padStart(2, '0')}`;
}

/** Fallback for records whose sector has no colour set in the CRM. */
export const NEUTRAL_SECTOR = '#64748B';

export function sectorColor(color: string | null | undefined): string {
  return color && /^#[0-9a-f]{6}$/i.test(color) ? color : NEUTRAL_SECTOR;
}

// ─── Radii ───────────────────────────────────────────────────────────────────

export const radius = { sm: 8, md: 12, lg: 18, xl: 26, pill: 999 };

/**
 * Monospaced-ish stack for figures that should align in a column.
 * Platform.select keeps it native rather than shipping a font file.
 */
export const numericFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'ui-monospace, SFMono-Regular, Menlo, monospace',
}) as string;
