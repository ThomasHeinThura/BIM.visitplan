import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle, TextStyle, StyleProp } from 'react-native';
import Svg, { Path, Circle, Rect, Line, Polyline, Polygon } from 'react-native-svg';
import { useTheme, radii, fonts } from '../context/ThemeContext';

// ─── Icons ───────────────────────────────────────────────────────────────────
// Stroke-based icons matching HTML's Lucide style. All accept size + color.

type IconProps = { size?: number; color?: string };

const stroke = (c: string) => ({
  stroke: c,
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none' as const,
});

export const Icon = {
  Home: ({ size = 22, color = '#000' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 12 12 3l9 9" {...stroke(color)} />
      <Path d="M5 10v10h14V10" {...stroke(color)} />
    </Svg>
  ),
  Calendar: ({ size = 22, color = '#000' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={3} y={5} width={18} height={16} rx={2} {...stroke(color)} />
      <Line x1={3} y1={10} x2={21} y2={10} {...stroke(color)} />
      <Line x1={8} y1={3} x2={8} y2={7} {...stroke(color)} />
      <Line x1={16} y1={3} x2={16} y2={7} {...stroke(color)} />
    </Svg>
  ),
  Building: ({ size = 22, color = '#000' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={4} y={3} width={16} height={18} rx={1.5} {...stroke(color)} />
      <Line x1={9} y1={8} x2={9} y2={8.01} {...stroke(color)} />
      <Line x1={15} y1={8} x2={15} y2={8.01} {...stroke(color)} />
      <Line x1={9} y1={12} x2={9} y2={12.01} {...stroke(color)} />
      <Line x1={15} y1={12} x2={15} y2={12.01} {...stroke(color)} />
      <Path d="M10 21v-4h4v4" {...stroke(color)} />
    </Svg>
  ),
  Chart: ({ size = 22, color = '#000' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Line x1={4} y1={20} x2={20} y2={20} {...stroke(color)} />
      <Rect x={6} y={12} width={3} height={8} {...stroke(color)} />
      <Rect x={11} y={7} width={3} height={13} {...stroke(color)} />
      <Rect x={16} y={14} width={3} height={6} {...stroke(color)} />
    </Svg>
  ),
  User: ({ size = 22, color = '#000' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={8} r={4} {...stroke(color)} />
      <Path d="M4 21c0-4 4-6 8-6s8 2 8 6" {...stroke(color)} />
    </Svg>
  ),
  Plus: ({ size = 22, color = '#fff' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Line x1={12} y1={5} x2={12} y2={19} {...stroke(color)} />
      <Line x1={5} y1={12} x2={19} y2={12} {...stroke(color)} />
    </Svg>
  ),
  Search: ({ size = 18, color = '#000' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={11} cy={11} r={7} {...stroke(color)} />
      <Line x1={20} y1={20} x2={16} y2={16} {...stroke(color)} />
    </Svg>
  ),
  Bell: ({ size = 22, color = '#000' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" {...stroke(color)} />
      <Path d="M10 21a2 2 0 0 0 4 0" {...stroke(color)} />
    </Svg>
  ),
  Check: ({ size = 18, color = '#fff' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Polyline points="5 12 10 17 19 8" {...stroke(color)} />
    </Svg>
  ),
  ChevronRight: ({ size = 18, color = '#000' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Polyline points="9 6 15 12 9 18" {...stroke(color)} />
    </Svg>
  ),
  ChevronLeft: ({ size = 18, color = '#000' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Polyline points="15 6 9 12 15 18" {...stroke(color)} />
    </Svg>
  ),
  ChevronDown: ({ size = 18, color = '#000' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Polyline points="6 9 12 15 18 9" {...stroke(color)} />
    </Svg>
  ),
  MapPin: ({ size = 16, color = '#000' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 22s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12z" {...stroke(color)} />
      <Circle cx={12} cy={10} r={2.5} {...stroke(color)} />
    </Svg>
  ),
  Clock: ({ size = 16, color = '#000' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={9} {...stroke(color)} />
      <Polyline points="12 7 12 12 16 14" {...stroke(color)} />
    </Svg>
  ),
  Users: ({ size = 18, color = '#000' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={9} cy={8} r={3.5} {...stroke(color)} />
      <Path d="M2 21c0-3 3-5 7-5s7 2 7 5" {...stroke(color)} />
      <Circle cx={17} cy={9} r={2.5} {...stroke(color)} />
      <Path d="M16 14c3 0 6 1.5 6 4" {...stroke(color)} />
    </Svg>
  ),
  Edit: ({ size = 16, color = '#000' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 20h4l11-11-4-4L4 16v4z" {...stroke(color)} />
    </Svg>
  ),
  X: ({ size = 18, color = '#000' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Line x1={6} y1={6} x2={18} y2={18} {...stroke(color)} />
      <Line x1={18} y1={6} x2={6} y2={18} {...stroke(color)} />
    </Svg>
  ),
  Logout: ({ size = 18, color = '#000' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M16 17l5-5-5-5" {...stroke(color)} />
      <Line x1={21} y1={12} x2={9} y2={12} {...stroke(color)} />
      <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" {...stroke(color)} />
    </Svg>
  ),
  Moon: ({ size = 18, color = '#000' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" {...stroke(color)} />
    </Svg>
  ),
  Sun: ({ size = 18, color = '#000' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={4} {...stroke(color)} />
      <Line x1={12} y1={2} x2={12} y2={5} {...stroke(color)} />
      <Line x1={12} y1={19} x2={12} y2={22} {...stroke(color)} />
      <Line x1={2} y1={12} x2={5} y2={12} {...stroke(color)} />
      <Line x1={19} y1={12} x2={22} y2={12} {...stroke(color)} />
      <Line x1={4.9} y1={4.9} x2={7} y2={7} {...stroke(color)} />
      <Line x1={17} y1={17} x2={19.1} y2={19.1} {...stroke(color)} />
      <Line x1={4.9} y1={19.1} x2={7} y2={17} {...stroke(color)} />
      <Line x1={17} y1={7} x2={19.1} y2={4.9} {...stroke(color)} />
    </Svg>
  ),
  Settings: ({ size = 18, color = '#000' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={3} {...stroke(color)} />
      <Path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" {...stroke(color)} />
    </Svg>
  ),
  // Brand mark: rounded teal square w/ folder check
  BrandMark: ({ size = 32, color = '#fff' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Path d="M6 10a2 2 0 0 1 2-2h6l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V10z" fill={color} fillOpacity={0.15} />
      <Polyline points="11 16 14.5 19.5 21 13" {...stroke(color)} />
    </Svg>
  ),
  Microsoft: ({ size = 18 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={2} y={2} width={9} height={9} fill="#F25022" />
      <Rect x={13} y={2} width={9} height={9} fill="#7FBA00" />
      <Rect x={2} y={13} width={9} height={9} fill="#00A4EF" />
      <Rect x={13} y={13} width={9} height={9} fill="#FFB900" />
    </Svg>
  ),
};

// ─── Card ────────────────────────────────────────────────────────────────────

export function Card({ children, style, padded = true, onPress }: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  onPress?: () => void;
}) {
  const { theme } = useTheme();
  const base: ViewStyle = {
    backgroundColor: theme.surface,
    borderRadius: radii.lg,
    padding: padded ? 16 : 0,
    borderWidth: 1,
    borderColor: theme.border,
  };
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [base, pressed && { opacity: 0.85 }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

// ─── Badge ───────────────────────────────────────────────────────────────────

type BadgeTone = 'teal' | 'success' | 'warn' | 'error' | 'muted' | 'purple' | 'orange' | 'info';

export function Badge({ children, tone = 'muted', style }: {
  children: React.ReactNode;
  tone?: BadgeTone;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  const map: Record<BadgeTone, { bg: string; fg: string }> = {
    teal:    { bg: theme.primaryLight, fg: theme.primary },
    success: { bg: theme.successLight, fg: theme.success },
    warn:    { bg: theme.warningLight, fg: theme.warning },
    error:   { bg: theme.errorLight, fg: theme.error },
    muted:   { bg: theme.surfaceOffset, fg: theme.textSecondary },
    purple:  { bg: theme.purpleLight, fg: theme.purple },
    orange:  { bg: theme.orangeLight, fg: theme.orange },
    info:    { bg: theme.primaryLight, fg: theme.info },
  };
  const c = map[tone];
  return (
    <View style={[{
      backgroundColor: c.bg,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radii.sm,
      alignSelf: 'flex-start',
    }, style]}>
      <Text style={{ color: c.fg, fontSize: 11, fontWeight: '600', fontFamily: fonts.body }}>
        {children}
      </Text>
    </View>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

export function KPICard({ value, label, delta, deltaTone, accent }: {
  value: React.ReactNode;
  label: string;
  delta?: string;
  deltaTone?: 'up' | 'down' | 'flat';
  accent?: string;
}) {
  const { theme } = useTheme();
  const deltaColor = deltaTone === 'up' ? theme.success
    : deltaTone === 'down' ? theme.warning
    : theme.textSecondary;
  return (
    <Card style={{ flex: 1, padding: 14 }}>
      <Text style={{
        fontSize: 26, fontWeight: '800', color: accent ?? theme.primary, fontFamily: fonts.display,
      }}>{value}</Text>
      <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 4 }}>{label}</Text>
      {delta ? (
        <Text style={{ fontSize: 10, color: deltaColor, marginTop: 4, fontWeight: '600' }}>
          {deltaTone === 'up' ? '↑ ' : deltaTone === 'down' ? '↓ ' : ''}{delta}
        </Text>
      ) : null}
    </Card>
  );
}

// ─── Section header ──────────────────────────────────────────────────────────

export function SectionHead({ title, action, onAction }: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const { theme } = useTheme();
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, marginTop: 24, marginBottom: 10,
    }}>
      <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text, fontFamily: fonts.display }}>
        {title}
      </Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={{ fontSize: 12, color: theme.primary, fontWeight: '600' }}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

export function Avatar({ name, size = 36, bg }: { name: string; size?: number; bg?: string }) {
  const { theme } = useTheme();
  const initials = name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: bg ?? theme.primaryLight,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color: theme.primary, fontWeight: '700', fontSize: size * 0.36 }}>
        {initials}
      </Text>
    </View>
  );
}

// ─── FAB ─────────────────────────────────────────────────────────────────────

export function FAB({ onPress, icon }: { onPress: () => void; icon?: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{
        position: 'absolute', right: 20, bottom: 96,
        width: 52, height: 52, borderRadius: 26,
        backgroundColor: theme.primary,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: theme.primary, shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
      }, pressed && { transform: [{ scale: 0.96 }] }]}
    >
      {icon ?? <Icon.Plus size={24} color="#fff" />}
    </Pressable>
  );
}

// ─── Buttons ─────────────────────────────────────────────────────────────────

export function PrimaryButton({ label, onPress, disabled, icon, style }: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [{
        backgroundColor: disabled ? theme.surfaceOffset : theme.primary,
        paddingVertical: 14, paddingHorizontal: 18,
        borderRadius: radii.md,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      }, pressed && !disabled && { opacity: 0.9 }, style]}
    >
      {icon}
      <Text style={{
        color: disabled ? theme.textFaint : '#fff',
        fontWeight: '700', fontSize: 15, fontFamily: fonts.body,
      }}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress, style }: {
  label: string; onPress: () => void; style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{
        backgroundColor: theme.surfaceOffset,
        paddingVertical: 14, paddingHorizontal: 18,
        borderRadius: radii.md,
        alignItems: 'center', justifyContent: 'center',
      }, pressed && { opacity: 0.85 }, style]}
    >
      <Text style={{ color: theme.text, fontWeight: '600', fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

// ─── Filter / Tab chips ──────────────────────────────────────────────────────

export function FilterTab({ label, active, onPress }: {
  label: string; active: boolean; onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{
        paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: radii.full,
        backgroundColor: active ? theme.primary : theme.surfaceOffset,
      }, pressed && { opacity: 0.85 }]}
    >
      <Text style={{
        color: active ? '#fff' : theme.textSecondary,
        fontSize: 12, fontWeight: '600',
      }}>{label}</Text>
    </Pressable>
  );
}

// ─── Visit row item ──────────────────────────────────────────────────────────

export function VisitItem({ time, title, client, location, status, onPress, onMore }: {
  time: string;
  title: string;
  client?: string;
  location?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'missed';
  onPress?: () => void;
  onMore?: () => void;
}) {
  const { theme } = useTheme();
  const tone: BadgeTone = status === 'completed' ? 'success'
    : status === 'in_progress' ? 'warn'
    : status === 'missed' ? 'error'
    : 'teal';
  const dot = status === 'completed' ? theme.success
    : status === 'in_progress' ? theme.warning
    : status === 'missed' ? theme.error
    : theme.primary;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{
      flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12,
    }, pressed && { backgroundColor: theme.surfaceOffset }]}>
      <View style={{ width: 56, alignItems: 'center' }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text }}>{time}</Text>
        <View style={{ width: 1, flex: 1, backgroundColor: theme.divider, marginTop: 6 }} />
      </View>
      <View style={{ width: 12, alignItems: 'center', paddingTop: 4 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dot, borderWidth: 2, borderColor: theme.surface }} />
      </View>
      <View style={{ flex: 1, paddingLeft: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text, flex: 1 }} numberOfLines={1}>
            {title}
          </Text>
          <Badge tone={tone} style={{ marginLeft: 8 }}>
            {status === 'in_progress' ? 'Active' : status === 'completed' ? 'Done' : status === 'missed' ? 'Missed' : 'Planned'}
          </Badge>
        </View>
        {client ? (
          <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 3 }} numberOfLines={1}>{client}</Text>
        ) : null}
        {location ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
            <Icon.MapPin size={11} color={theme.textFaint} />
            <Text style={{ fontSize: 11, color: theme.textFaint }} numberOfLines={1}>{location}</Text>
          </View>
        ) : null}
      </View>
      {onMore ? (
        <Pressable onPress={onMore} hitSlop={10} style={{ padding: 6, marginLeft: 4 }}>
          <Icon.Edit size={14} color={theme.textFaint} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

// ─── Search bar ──────────────────────────────────────────────────────────────

export function SearchBar({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const { theme } = useTheme();
  // Use TextInput from RN
  const TextInput = require('react-native').TextInput;
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: theme.surfaceOffset, borderRadius: radii.md,
      paddingHorizontal: 12, height: 40,
    }}>
      <Icon.Search size={16} color={theme.textFaint} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.textFaint}
        style={{ flex: 1, color: theme.text, fontSize: 14, fontFamily: fonts.body, outlineWidth: 0 }}
      />
    </View>
  );
}

// ─── Generic styles re-export ────────────────────────────────────────────────

export const ui = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  spaceBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
