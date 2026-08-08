/**
 * Loading, empty, error and no-access states.
 *
 * These carry more weight here than in most apps. The CRM starts with no visits and
 * no deals, so on day one an empty state is the FIRST thing every user sees — a bare
 * screen would read as a broken app. And because the API applies row-level scoping,
 * a 403 is a normal outcome rather than a fault, so it gets its own presentation
 * instead of being lumped in with real errors.
 */

import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { useTheme, fonts, radii } from '../../context/ThemeContext';
import { PrimaryButton } from '../ui';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  const { theme } = useTheme();

  return (
    <View style={{ paddingVertical: 48, alignItems: 'center', gap: 12 }}>
      <ActivityIndicator color={theme.primary} />
      <Text style={{ color: theme.textSecondary, fontSize: 13, fontFamily: fonts.body }}>
        {label}
      </Text>
    </View>
  );
}

export function EmptyState({
  icon = '◦',
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon?: string;
  title: string;
  /** Say what is missing AND what to do about it — "no visits yet" alone is a dead end. */
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { theme } = useTheme();

  return (
    <View style={{ paddingVertical: 44, paddingHorizontal: 32, alignItems: 'center', gap: 10 }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: radii.full,
          backgroundColor: theme.surfaceOffset,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 24, color: theme.textFaint }}>{icon}</Text>
      </View>

      <Text
        style={{
          fontSize: 15,
          fontWeight: '700',
          color: theme.text,
          fontFamily: fonts.display,
          textAlign: 'center',
        }}
      >
        {title}
      </Text>

      <Text
        style={{
          fontSize: 13,
          color: theme.textSecondary,
          textAlign: 'center',
          lineHeight: 19,
          fontFamily: fonts.body,
        }}
      >
        {message}
      </Text>

      {actionLabel && onAction ? (
        <View style={{ marginTop: 8, alignSelf: 'stretch' }}>
          <PrimaryButton label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

/**
 * Separate from EmptyState on purpose. "You don't have access to this" and "there is
 * nothing here" are different facts, and conflating them makes a permissions problem
 * look like missing data.
 */
export function NoAccessState({ what }: { what: string }) {
  return (
    <EmptyState
      icon="⊘"
      title="No access"
      message={`Your role doesn't include access to ${what}. Ask an administrator if you think this is wrong.`}
    />
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const { theme } = useTheme();

  return (
    <View style={{ paddingVertical: 40, paddingHorizontal: 32, alignItems: 'center', gap: 10 }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: radii.full,
          backgroundColor: theme.errorLight,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 24, color: theme.error }}>!</Text>
      </View>

      <Text
        style={{
          fontSize: 15,
          fontWeight: '700',
          color: theme.text,
          fontFamily: fonts.display,
          textAlign: 'center',
        }}
      >
        Something went wrong
      </Text>

      {/* The server's own message, verbatim. It is more specific than anything the
          client could invent, and validation messages in particular name the field. */}
      <Text
        style={{
          fontSize: 13,
          color: theme.textSecondary,
          textAlign: 'center',
          lineHeight: 19,
          fontFamily: fonts.body,
        }}
      >
        {message}
      </Text>

      {onRetry ? (
        <View style={{ marginTop: 8, alignSelf: 'stretch' }}>
          <PrimaryButton label="Try again" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}
