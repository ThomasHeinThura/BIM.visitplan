/**
 * Card surfaces, stat tiles and the small pieces the screens are assembled from.
 *
 * The one rule running through all of it: anything that belongs to a sector shows that
 * sector's colour on its leading edge. Colour is the territory index, so a rep can scan
 * a list and see the shape of their day before reading a single word.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { alpha, elevation, radius, sectorColor, space, type } from './tokens';

// ─── Card ────────────────────────────────────────────────────────────────────

export function Card({
  children,
  onPress,
  /** Draws a 3px leading edge in this sector's colour. */
  accent,
  level = 1,
  style,
  padded = true,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  accent?: string | null;
  level?: 0 | 1 | 2 | 3;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  const { theme } = useTheme();
  const edge = accent === undefined ? null : sectorColor(accent);

  const base: ViewStyle = {
    backgroundColor: theme.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
    ...elevation(level, theme.cardShadow),
  };

  const inner = (
    <View style={{ flexDirection: 'row' }}>
      {edge ? <View style={{ width: 3, backgroundColor: edge }} /> : null}
      <View style={{ flex: 1, padding: padded ? space.lg : 0 }}>{children}</View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          base,
          // Scale rather than opacity: a card that fades looks disabled, one that
          // presses in reads as a button.
          pressed && { transform: [{ scale: 0.985 }], borderColor: alpha(theme.primary, 0.4) },
          style,
        ]}
      >
        {inner}
      </Pressable>
    );
  }

  return <View style={[base, style]}>{inner}</View>;
}

// ─── Stat tile ───────────────────────────────────────────────────────────────

export function StatTile({
  value,
  label,
  tone = 'neutral',
  caption,
}: {
  value: number | string;
  label: string;
  tone?: 'neutral' | 'brand' | 'warn' | 'good';
  caption?: string;
}) {
  const { theme } = useTheme();

  const accent =
    tone === 'brand' ? theme.primary
    : tone === 'warn' ? theme.error
    : tone === 'good' ? theme.success
    : theme.textSecondary;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.surface,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: theme.border,
        paddingVertical: space.md,
        paddingHorizontal: space.sm,
        gap: 2,
        overflow: 'hidden',
        ...elevation(1, theme.cardShadow),
      }}
    >
      {/* A top rule rather than a full tint: the number stays the loudest thing. */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          backgroundColor: tone === 'neutral' ? theme.border : accent,
        }}
      />

      <Text style={[type.display, { color: tone === 'neutral' ? theme.text : accent }]}>{value}</Text>
      <Text style={[type.micro, { color: theme.textFaint }]} numberOfLines={1}>
        {label}
      </Text>
      {caption ? (
        <Text style={[type.bodySm, { color: theme.textFaint, fontSize: 10 }]} numberOfLines={1}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

// ─── Sector chip ─────────────────────────────────────────────────────────────

export function SectorChip({ name, color }: { name: string; color?: string | null }) {
  const base = sectorColor(color);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: alpha(base, 0.14),
        borderWidth: 1,
        borderColor: alpha(base, 0.35),
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: radius.pill,
        // Sector names are free text in the CRM — "Manufacturing, Distribution &
        // Retail" is a real one. Without shrinking, a long name pushes the chip past
        // the card edge instead of ellipsising inside it.
        flexShrink: 1,
        maxWidth: '100%',
      }}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: base }} />
      <Text style={[type.micro, { color: base, letterSpacing: 0.5, flexShrink: 1 }]} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

// ─── Status pill ─────────────────────────────────────────────────────────────

export function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: 'planned' | 'done' | 'cancelled' | 'overdue' | 'lead' | 'progress' | 'won' | 'lost';
}) {
  const { theme } = useTheme();

  const color =
    tone === 'done' || tone === 'won' ? theme.success
    : tone === 'overdue' || tone === 'lost' ? theme.error
    : tone === 'cancelled' ? theme.textFaint
    : tone === 'progress' ? theme.info
    : theme.primary;

  return (
    <View
      style={{
        backgroundColor: alpha(color, 0.15),
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: radius.pill,
      }}
    >
      <Text style={[type.micro, { color, letterSpacing: 0.6 }]}>{label}</Text>
    </View>
  );
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

export function Avatar({ name, size = 30, color }: { name: string; size?: number; color?: string | null }) {
  const base = sectorColor(color);

  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: alpha(base, 0.18),
        borderWidth: 1,
        borderColor: alpha(base, 0.4),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: base, fontSize: size * 0.36, fontWeight: '700' }}>{initials}</Text>
    </View>
  );
}

// ─── Proportion bar ──────────────────────────────────────────────────────────

/**
 * A stage's share of total pipeline value. Encodes something true — where the money
 * actually sits — rather than decorating the column header.
 */
export function ProportionBar({ fraction, color }: { fraction: number; color: string }) {
  const { theme } = useTheme();
  const width = useRef(new Animated.Value(0)).current;
  const target = Math.min(Math.max(fraction, 0), 1);

  useEffect(() => {
    Animated.timing(width, {
      toValue: target,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      // Animating width cannot run on the native thread.
      useNativeDriver: false,
    }).start();
  }, [target, width]);

  return (
    <View
      style={{
        height: 3,
        borderRadius: 2,
        backgroundColor: theme.surfaceOffset,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={{
          height: 3,
          borderRadius: 2,
          backgroundColor: color,
          width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }}
      />
    </View>
  );
}

// ─── Entrance animation ──────────────────────────────────────────────────────

/**
 * Staggered fade-and-rise for list items.
 *
 * Capped at eight steps so a fifty-row list does not take four seconds to finish
 * arriving, and skipped entirely past that index — late rows appear instantly, which is
 * what a user scrolling quickly expects anyway.
 */
export function Rise({ index = 0, children }: { index?: number; children: React.ReactNode }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 320,
      delay: Math.min(index, 8) * 45,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [index, progress]);

  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

// ─── Section header ──────────────────────────────────────────────────────────

export function SectionHeader({
  eyebrow,
  title,
  action,
  onAction,
}: {
  eyebrow?: string;
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const { theme } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingHorizontal: space.lg,
        marginTop: space.xl,
        marginBottom: space.md,
        gap: space.md,
      }}
    >
      <View style={{ flex: 1, gap: 3 }}>
        {eyebrow ? <Text style={[type.micro, { color: theme.primary }]}>{eyebrow}</Text> : null}
        <Text style={[type.title, { color: theme.text }]}>{title}</Text>
      </View>

      {action ? (
        <Pressable onPress={onAction} hitSlop={10}>
          <Text style={[type.micro, { color: theme.primary, letterSpacing: 0.5 }]}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
