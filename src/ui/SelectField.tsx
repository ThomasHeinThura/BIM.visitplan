/**
 * A searchable select.
 *
 * Rule this exists to enforce: past about four options, a row of chips stops being a
 * picker and becomes a wall. This CRM has hundreds of clients, so the chip list both
 * buried the field it belonged to and — worse — silently truncated, because it could
 * only render whatever page had been preloaded.
 *
 * Two modes:
 *   - `options`  static list, filtered locally. For small fixed sets like sectors.
 *   - `search`   async, queried server-side with debounce. For sets too large to hold,
 *                where local filtering would only ever search the first page.
 *
 * `hint` disambiguates entries that share a name — this data legitimately contains
 * several clients called "AGD Bank" in different sectors, and a bare list gives no way
 * to tell them apart.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { alpha, radius, space, type } from './tokens';

export type SelectOption = {
  id: number;
  label: string;
  /** Secondary line — sector, industry, anything that separates same-named entries. */
  hint?: string | null;
  /** Drives the leading dot, so the picker carries the same sector colour as the lists. */
  color?: string | null;
};

export function SelectField({
  label,
  value,
  onChange,
  options,
  search,
  placeholder = 'Select',
  searchPlaceholder = 'Search',
  optional = false,
  error,
  disabled = false,
}: {
  label: string;
  value: SelectOption | null;
  onChange: (option: SelectOption | null) => void;
  options?: SelectOption[];
  search?: (query: string, signal: AbortSignal) => Promise<SelectOption[]>;
  placeholder?: string;
  searchPlaceholder?: string;
  optional?: boolean;
  error?: string;
  disabled?: boolean;
}) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={[type.micro, { color: theme.textSecondary }]}>{label}</Text>
        {optional ? (
          <Text style={[type.micro, { color: theme.textFaint, letterSpacing: 0.4 }]}>Optional</Text>
        ) : null}
      </View>

      <Pressable
        onPress={() => !disabled && setOpen(true)}
        style={({ pressed }) => [
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.sm,
            backgroundColor: theme.inputBg,
            borderRadius: radius.md,
            borderWidth: 1.5,
            borderColor: error ? theme.error : theme.inputBorder,
            paddingHorizontal: space.md,
            minHeight: 46,
            opacity: disabled ? 0.5 : 1,
          },
          pressed && !disabled && { borderColor: theme.primary },
        ]}
      >
        {value?.color ? (
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: value.color }} />
        ) : null}

        <View style={{ flex: 1, paddingVertical: space.sm }}>
          <Text
            numberOfLines={1}
            style={[type.body, { color: value ? theme.text : theme.textFaint }]}
          >
            {value?.label ?? placeholder}
          </Text>
          {value?.hint ? (
            <Text numberOfLines={1} style={[type.micro, { color: theme.textFaint, marginTop: 2 }]}>
              {value.hint}
            </Text>
          ) : null}
        </View>

        {/* Clearing is on the field itself: making someone open the sheet to unset an
            optional value is a needless round trip. */}
        {value && optional && !disabled ? (
          <Pressable onPress={() => onChange(null)} hitSlop={10} style={{ padding: 4 }}>
            <Text style={{ color: theme.textFaint, fontSize: 15 }}>✕</Text>
          </Pressable>
        ) : null}

        <Text style={{ color: theme.textFaint, fontSize: 13 }}>▾</Text>
      </Pressable>

      {error ? <Text style={[type.bodySm, { color: theme.error }]}>{error}</Text> : null}

      <OptionSheet
        visible={open}
        title={label}
        placeholder={searchPlaceholder}
        options={options}
        search={search}
        selectedId={value?.id ?? null}
        allowNone={optional}
        onClose={() => setOpen(false)}
        onPick={(option) => {
          onChange(option);
          setOpen(false);
        }}
      />
    </View>
  );
}

function OptionSheet({
  visible,
  title,
  placeholder,
  options,
  search,
  selectedId,
  allowNone,
  onClose,
  onPick,
}: {
  visible: boolean;
  title: string;
  placeholder: string;
  options?: SelectOption[];
  search?: (query: string, signal: AbortSignal) => Promise<SelectOption[]>;
  selectedId: number | null;
  allowNone: boolean;
  onClose: () => void;
  onPick: (option: SelectOption | null) => void;
}) {
  const { theme } = useTheme();

  const [query, setQuery] = useState('');
  const [remote, setRemote] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(false);

  const controller = useRef<AbortController | null>(null);

  // Reset between openings so a stale query does not greet the next use.
  useEffect(() => {
    if (visible) {
      setQuery('');
      setRemote([]);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || !search) return;

    const timer = setTimeout(() => {
      controller.current?.abort();

      const next = new AbortController();
      controller.current = next;

      setLoading(true);

      search(query.trim(), next.signal)
        .then((results) => {
          if (!next.signal.aborted) setRemote(results);
        })
        .catch(() => {
          // Aborted or failed — leave the previous results rather than blanking the
          // list under the user mid-type.
        })
        .finally(() => {
          if (!next.signal.aborted) setLoading(false);
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [query, visible, search]);

  useEffect(() => () => controller.current?.abort(), []);

  const shown = useMemo(() => {
    if (search) return remote;

    const term = query.trim().toLowerCase();
    if (!term) return options ?? [];

    return (options ?? []).filter(
      (option) =>
        option.label.toLowerCase().includes(term) || (option.hint ?? '').toLowerCase().includes(term),
    );
  }, [search, remote, options, query]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{
            backgroundColor: theme.surface,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            paddingTop: space.md,
            // Capped so the sheet never covers the whole screen — the field it belongs
            // to stays visible above it.
            maxHeight: '78%',
          }}
        >
          <View
            style={{
              width: 38,
              height: 4,
              borderRadius: 2,
              backgroundColor: theme.border,
              alignSelf: 'center',
              marginBottom: space.md,
            }}
          />

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: space.lg,
              marginBottom: space.md,
            }}
          >
            <Text style={[type.title, { color: theme.text }]}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={[type.micro, { color: theme.primary }]}>Done</Text>
            </Pressable>
          </View>

          <View style={{ paddingHorizontal: space.lg, marginBottom: space.md }}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={placeholder}
              placeholderTextColor={theme.textFaint}
              autoCorrect={false}
              style={{
                backgroundColor: theme.inputBg,
                borderRadius: radius.md,
                borderWidth: 1.5,
                borderColor: theme.inputBorder,
                paddingHorizontal: space.md,
                height: 44,
                color: theme.text,
                fontSize: 14,
              }}
            />
          </View>

          <FlatList
            data={shown}
            keyExtractor={(option) => String(option.id)}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: space.xxl }}
            ListHeaderComponent={
              allowNone ? (
                <Row
                  label="None"
                  selected={selectedId === null}
                  muted
                  onPress={() => onPick(null)}
                />
              ) : null
            }
            renderItem={({ item }) => (
              <Row
                label={item.label}
                hint={item.hint}
                color={item.color}
                selected={item.id === selectedId}
                onPress={() => onPick(item)}
              />
            )}
            ListEmptyComponent={
              loading ? (
                <View style={{ paddingVertical: space.xl, alignItems: 'center' }}>
                  <ActivityIndicator color={theme.primary} />
                </View>
              ) : (
                <View style={{ paddingVertical: space.xl, alignItems: 'center', gap: 4 }}>
                  <Text style={[type.body, { color: theme.textSecondary }]}>No matches</Text>
                  <Text style={[type.bodySm, { color: theme.textFaint }]}>
                    {query ? `Nothing found for "${query.trim()}".` : 'Nothing to choose from yet.'}
                  </Text>
                </View>
              )
            }
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Row({
  label,
  hint,
  color,
  selected,
  muted = false,
  onPress,
}: {
  label: string;
  hint?: string | null;
  color?: string | null;
  selected: boolean;
  muted?: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
          paddingHorizontal: space.lg,
          paddingVertical: 13,
          backgroundColor: selected ? alpha(theme.primary, 0.1) : 'transparent',
        },
        pressed && { backgroundColor: theme.surfaceOffset },
      ]}
    >
      {color ? (
        <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: color }} />
      ) : null}

      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={1}
          style={[type.body, { color: muted ? theme.textFaint : theme.text }]}
        >
          {label}
        </Text>
        {hint ? (
          <Text numberOfLines={1} style={[type.bodySm, { color: theme.textFaint, marginTop: 1 }]}>
            {hint}
          </Text>
        ) : null}
      </View>

      {selected ? <Text style={{ color: theme.primary, fontSize: 15 }}>✓</Text> : null}
    </Pressable>
  );
}
