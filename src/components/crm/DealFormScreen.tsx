/**
 * Add or edit a lead / deal.
 *
 * One form for both: creating differs only in needing a sector, since a new deal has
 * to know which pipeline it belongs to. On edit the sector and stage are fixed —
 * moving between stages happens on the board, and moving between sectors would change
 * which pipeline the deal lives in, which is not a field-level edit.
 *
 * Validation errors come back from the server keyed by field and are shown against the
 * field. The client does not duplicate the rules; it just presents what the server said.
 */

import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { fonts, radii, useTheme } from '../../context/ThemeContext';
import { listClients, listSectors } from '../../lib/crm/clients';
import { createDeal, updateDeal } from '../../lib/crm/deals';
import { CrmApiError } from '../../lib/crm/client';
import type { Deal } from '../../lib/crm/types';
import { LoadingState } from './States';
import { useResource } from './useResource';

function Field({
  label,
  value,
  onChange,
  placeholder,
  error,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric';
}) {
  const { theme } = useTheme();

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSecondary }}>{label}</Text>

      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.textFaint}
        multiline={multiline}
        keyboardType={keyboardType ?? 'default'}
        style={{
          backgroundColor: theme.inputBg,
          borderRadius: radii.md,
          borderWidth: 1.5,
          // A field with an error gets a red border as well as the message, so the
          // problem is findable without reading every label.
          borderColor: error ? theme.error : theme.inputBorder,
          paddingHorizontal: 12,
          paddingVertical: 10,
          minHeight: multiline ? 88 : 42,
          textAlignVertical: multiline ? 'top' : 'center',
          color: theme.text,
          fontSize: 14,
          fontFamily: fonts.body,
        }}
      />

      {error ? <Text style={{ fontSize: 11, color: theme.error }}>{error}</Text> : null}
    </View>
  );
}

function Chips<T extends { id: number; name: string }>({
  label,
  items,
  selectedId,
  onSelect,
  error,
}: {
  label: string;
  items: T[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  error?: string;
}) {
  const { theme } = useTheme();

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSecondary }}>{label}</Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {items.map((item) => {
          const active = selectedId === item.id;

          return (
            <Pressable
              key={item.id}
              onPress={() => onSelect(item.id)}
              style={({ pressed }) => [
                {
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: radii.full,
                  backgroundColor: active ? theme.primary : theme.surfaceOffset,
                  borderWidth: 1,
                  borderColor: active ? theme.primary : theme.border,
                },
                pressed && { opacity: 0.75 },
              ]}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: active ? '700' : '500',
                  color: active ? '#fff' : theme.textSecondary,
                }}
              >
                {item.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error ? <Text style={{ fontSize: 11, color: theme.error }}>{error}</Text> : null}
    </View>
  );
}

export function DealFormScreen({
  deal,
  onSaved,
  onCancel,
}: {
  /** Absent means create. */
  deal?: Deal;
  onSaved: (deal: Deal) => void;
  onCancel: () => void;
}) {
  const { theme } = useTheme();
  const isEdit = deal !== undefined;

  const [title, setTitle] = useState(deal?.title ?? '');
  const [value, setValue] = useState(deal?.value ?? '');
  const [notes, setNotes] = useState(deal?.notes ?? '');
  const [sectorId, setSectorId] = useState<number | null>(deal?.sector?.id ?? null);
  const [clientId, setClientId] = useState<number | null>(deal?.client?.id ?? null);

  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Sectors are only needed when creating — on edit the pipeline is already decided.
  const sectors = useResource((signal) => (isEdit ? Promise.resolve([]) : listSectors(signal)), [isEdit]);
  const clients = useResource((signal) => listClients({ per_page: 100 }, signal), []);

  const save = async () => {
    setSaving(true);
    setFieldErrors({});
    setFormError(null);

    try {
      const trimmedValue = value.trim();

      const saved = isEdit
        ? await updateDeal(deal.id, {
            title: title.trim(),
            client_id: clientId ?? undefined,
            value: trimmedValue === '' ? undefined : trimmedValue,
            notes: notes.trim() === '' ? undefined : notes.trim(),
          })
        : await createDeal({
            title: title.trim(),
            // Guarded by the disabled state below, so this is never reached unset.
            sector_id: sectorId as number,
            client_id: clientId ?? undefined,
            value: trimmedValue === '' ? undefined : trimmedValue,
            notes: notes.trim() === '' ? undefined : notes.trim(),
          });

      onSaved(saved);
    } catch (e) {
      if (e instanceof CrmApiError) {
        setFieldErrors(e.fieldErrors);
        // Only show the banner when there is nothing field-level to point at,
        // otherwise the same problem is reported twice.
        if (Object.keys(e.fieldErrors).length === 0) setFormError(e.message);
      } else {
        setFormError('Could not save. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (clients.loading || sectors.loading) return <LoadingState label="Loading…" />;

  const canSave = title.trim() !== '' && (isEdit || sectorId !== null) && !saving;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={{ fontSize: 19, fontWeight: '700', color: theme.text, fontFamily: fonts.display }}>
        {isEdit ? 'Edit deal' : 'New lead'}
      </Text>

      {!isEdit ? (
        <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: -10 }}>
          Starts on the sector&apos;s lead stage. Move it along the pipeline from the board.
        </Text>
      ) : null}

      {formError ? (
        <View style={{ backgroundColor: theme.errorLight, borderRadius: radii.md, padding: 12 }}>
          <Text style={{ color: theme.error, fontSize: 13 }}>{formError}</Text>
        </View>
      ) : null}

      <Field
        label="Title"
        value={title}
        onChange={setTitle}
        placeholder="e.g. Core banking upgrade"
        error={fieldErrors.title?.[0]}
      />

      {!isEdit && sectors.data ? (
        <Chips
          label="Sector"
          items={sectors.data}
          selectedId={sectorId}
          onSelect={setSectorId}
          error={fieldErrors.sector_id?.[0]}
        />
      ) : null}

      {clients.data ? (
        <Chips
          label="Client (optional)"
          items={clients.data.data.map((c) => ({ id: c.id, name: c.name }))}
          selectedId={clientId}
          onSelect={(id) => setClientId(clientId === id ? null : id)}
          error={fieldErrors.client_id?.[0]}
        />
      ) : null}

      <Field
        label="Value (optional)"
        value={value}
        onChange={setValue}
        placeholder="0.00"
        keyboardType="numeric"
        error={fieldErrors.value?.[0]}
      />

      <Field
        label="Notes (optional)"
        value={notes}
        onChange={setNotes}
        placeholder="Context, next steps…"
        multiline
        error={fieldErrors.notes?.[0]}
      />

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
        <Pressable
          onPress={onCancel}
          style={{
            flex: 1,
            backgroundColor: theme.surfaceOffset,
            borderRadius: radii.md,
            paddingVertical: 13,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: theme.textSecondary, fontWeight: '600', fontSize: 14 }}>Cancel</Text>
        </Pressable>

        <Pressable
          onPress={save}
          disabled={!canSave}
          style={{
            flex: 2,
            backgroundColor: canSave ? theme.primary : theme.surfaceOffset,
            borderRadius: radii.md,
            paddingVertical: 13,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: canSave ? '#fff' : theme.textFaint,
              fontWeight: '700',
              fontSize: 14,
            }}
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create lead'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
