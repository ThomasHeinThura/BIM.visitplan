import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { styles } from '../styles';
import type { LookupItem } from '../types';

export function LabeledInput({
  label,
  containerStyle,
  ...props
}: React.ComponentProps<typeof TextInput> & { label: string; containerStyle?: object }) {
  return (
    <View style={[styles.fieldBlock, containerStyle]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor="#94A3B8"
        style={[styles.input, props.multiline ? styles.multilineInput : null]}
        {...props}
      />
    </View>
  );
}

export function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterChip,
        active ? styles.filterChipActive : null,
        pressed ? styles.filterChipPressed : null,
      ]}
    >
      <Text style={active ? styles.filterChipTextActive : styles.filterChipText}>{label}</Text>
    </Pressable>
  );
}

export function LookupChooser({
  label,
  query,
  selectedLabel,
  onChangeQuery,
  options,
  selectedId,
  onSelect,
  onClear,
  loading,
  helperText,
}: {
  label: string;
  query: string;
  selectedLabel?: string | null;
  onChangeQuery: (value: string) => void;
  options: LookupItem[];
  selectedId: number | null;
  onSelect: (id: number, label: string) => void;
  onClear: () => void;
  loading: boolean;
  helperText?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>

      <TextInput
        value={query}
        onChangeText={(value) => {
          onChangeQuery(value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={`Search ${label.toLowerCase()}`}
        placeholderTextColor="#94A3B8"
        style={[styles.input, styles.lookupInput]}
      />

      {selectedLabel ? (
        <View style={styles.lookupSelectionRow}>
          <Text style={styles.lookupSelectionCaption}>Selected</Text>
          <Text style={styles.lookupSelectionLabel}>{selectedLabel}</Text>
          <Pressable onPress={onClear} style={styles.clearSelectionButton}>
            <Text style={styles.clearSelectionText}>Clear</Text>
          </Pressable>
        </View>
      ) : null}

      {isOpen ? (
        <View style={styles.lookupPanel}>
          <ScrollView nestedScrollEnabled style={styles.lookupScroll}>
            {loading ? (
              <Text style={styles.lookupHint}>Loading options...</Text>
            ) : options.length === 0 ? (
              <Text style={styles.lookupHint}>No matching options.</Text>
            ) : (
              options.map((option) => (
                <Pressable
                  key={`${label}-${option.id}`}
                  onPress={() => {
                    onSelect(option.id, option.label);
                    setIsOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.lookupOption,
                    selectedId === option.id ? styles.lookupOptionActive : null,
                    pressed ? styles.lookupOptionPressed : null,
                  ]}
                >
                  <Text style={styles.lookupOptionText}>{option.label}</Text>
                  {option.subtitle ? <Text style={styles.lookupOptionSubtext}>{option.subtitle}</Text> : null}
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      ) : null}

      {helperText ? <Text style={styles.fieldHelper}>{helperText}</Text> : null}
    </View>
  );
}

export function TeamMemberChooser({
  query,
  onChangeQuery,
  options,
  allOptions,
  selectedIds,
  onToggle,
  loading,
}: {
  query: string;
  onChangeQuery: (value: string) => void;
  options: LookupItem[];
  allOptions: LookupItem[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  loading: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const chosenMembers = useMemo(
    () => allOptions.filter((item) => selectedIds.includes(item.id)),
    [allOptions, selectedIds],
  );

  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>Assign Team Members</Text>
      <TextInput
        value={query}
        onChangeText={(value) => {
          onChangeQuery(value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Search team members"
        placeholderTextColor="#94A3B8"
        style={styles.input}
      />

      {chosenMembers.length > 0 ? (
        <View style={styles.selectionChipRow}>
          {chosenMembers.map((member) => (
            <Pressable key={member.id} onPress={() => onToggle(member.id)} style={styles.selectionChip}>
              <Text style={styles.selectionChipText}>{member.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {isOpen ? (
        <View style={styles.lookupPanel}>
          <ScrollView nestedScrollEnabled style={styles.lookupScroll}>
            {loading ? (
              <Text style={styles.lookupHint}>Loading team...</Text>
            ) : options.length === 0 ? (
              <Text style={styles.lookupHint}>No matching team members.</Text>
            ) : (
              options.map((option) => {
                const selected = selectedIds.includes(option.id);

                return (
                  <Pressable
                    key={`team-${option.id}`}
                    onPress={() => onToggle(option.id)}
                    style={({ pressed }) => [
                      styles.lookupOption,
                      selected ? styles.lookupOptionActive : null,
                      pressed ? styles.lookupOptionPressed : null,
                    ]}
                  >
                    <Text style={styles.lookupOptionText}>{option.label}</Text>
                    <Text style={styles.lookupOptionSubtext}>{selected ? 'Assigned' : option.subtitle || 'Tap to assign'}</Text>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      ) : null}

      <Text style={styles.fieldHelper}>Assigned members will be included in the visit plan summary.</Text>
    </View>
  );
}