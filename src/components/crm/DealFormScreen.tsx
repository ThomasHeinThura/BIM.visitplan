/**
 * Add or edit a lead / deal.
 *
 * One form for both. Creating differs only in needing a sector, since a new deal has to
 * know which pipeline it belongs to. On edit the sector and stage are fixed — stages
 * are changed on the board, and changing sector would move the deal to a different
 * pipeline, which is not a field-level edit.
 *
 * Clients are chosen through a server-searched select, not a list of choices. There are
 * hundreds of them; rendering them all buried the rest of the form and, because only
 * one page was ever loaded, silently hid every client past the first hundred.
 *
 * Validation errors come back from the server keyed by field and are shown against that
 * field. The client does not restate the rules.
 */

import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useTheme } from '../../context/ThemeContext';
import { listClients, listSectors } from '../../lib/crm/clients';
import { CrmApiError } from '../../lib/crm/client';
import { createDeal, updateDeal } from '../../lib/crm/deals';
import type { Deal } from '../../lib/crm/types';
import { SelectField, type SelectOption } from '../../ui/SelectField';
import { radius, space, type } from '../../ui/tokens';
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
  optional = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric';
  optional?: boolean;
}) {
  const { theme } = useTheme();

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={[type.micro, { color: theme.textSecondary }]}>{label}</Text>
        {optional ? (
          <Text style={[type.micro, { color: theme.textFaint, letterSpacing: 0.4 }]}>Optional</Text>
        ) : null}
      </View>

      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.textFaint}
        multiline={multiline}
        keyboardType={keyboardType ?? 'default'}
        style={{
          backgroundColor: theme.inputBg,
          borderRadius: radius.md,
          borderWidth: 1.5,
          // A red border as well as the message, so the field is findable without
          // reading every label.
          borderColor: error ? theme.error : theme.inputBorder,
          paddingHorizontal: space.md,
          paddingVertical: space.md,
          minHeight: multiline ? 96 : 46,
          textAlignVertical: multiline ? 'top' : 'center',
          color: theme.text,
          fontSize: 14,
        }}
      />

      {error ? <Text style={[type.bodySm, { color: theme.error }]}>{error}</Text> : null}
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
  // Defaults to USD for a new deal, matching the column default. Most deals are in
  // dollars, and a picker that starts blank makes every one of them an extra tap.
  const [currency, setCurrency] = useState<'USD' | 'MMK'>(deal?.currency ?? 'USD');
  const [notes, setNotes] = useState(deal?.notes ?? '');

  const [sector, setSector] = useState<SelectOption | null>(
    deal?.sector ? { id: deal.sector.id, label: deal.sector.name, color: deal.sector.color } : null,
  );

  const [client, setClient] = useState<SelectOption | null>(
    deal?.client ? { id: deal.client.id, label: deal.client.name } : null,
  );

  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Sectors are a small fixed set and only needed when creating, so they load once and
  // filter locally. Clients are searched server-side instead — see below.
  const sectors = useResource(
    (signal) => (isEdit ? Promise.resolve([]) : listSectors(signal)),
    [isEdit],
  );

  const searchClients = React.useCallback(async (query: string, signal: AbortSignal) => {
    // per_page 25 because this is a picker, not a directory: the answer to "too many to
    // scroll" is a narrower search, not a longer list.
    const page = await listClients({ search: query || undefined, per_page: 25 }, signal);

    return page.data.map(
      (item): SelectOption => ({
        id: item.id,
        label: item.name,
        // Sector disambiguates same-named clients, which this data really does contain.
        hint: item.sector?.name ?? item.industry ?? null,
        color: item.sector?.color ?? null,
      }),
    );
  }, []);

  const save = async () => {
    setSaving(true);
    setFieldErrors({});
    setFormError(null);

    try {
      const trimmedValue = value.trim();

      const saved = isEdit
        ? await updateDeal(deal.id, {
            title: title.trim(),
            client_id: client?.id,
            value: trimmedValue === '' ? undefined : trimmedValue,
            currency,
            notes: notes.trim() === '' ? undefined : notes.trim(),
          })
        : await createDeal({
            title: title.trim(),
            // Guarded by the disabled save button below, so this is never unset here.
            sector_id: sector!.id,
            client_id: client?.id,
            value: trimmedValue === '' ? undefined : trimmedValue,
            currency,
            notes: notes.trim() === '' ? undefined : notes.trim(),
          });

      onSaved(saved);
    } catch (e) {
      if (e instanceof CrmApiError) {
        setFieldErrors(e.fieldErrors);
        // Only show the banner when there is no field to point at, or the same problem
        // gets reported twice.
        if (Object.keys(e.fieldErrors).length === 0) setFormError(e.message);
      } else {
        setFormError('Could not save. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (sectors.loading) return <LoadingState label="Loading…" />;

  const canSave = title.trim() !== '' && (isEdit || sector !== null) && !saving;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xxl }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ gap: 4 }}>
        <Text style={[type.micro, { color: theme.primary }]}>
          {isEdit ? 'Opportunity' : 'New opportunity'}
        </Text>
        <Text style={[type.display, { color: theme.text }]}>{isEdit ? 'Edit deal' : 'New lead'}</Text>
        {!isEdit ? (
          <Text style={[type.bodySm, { color: theme.textSecondary, marginTop: 2 }]}>
            Starts on the sector&apos;s lead stage. Move it along from the pipeline board.
          </Text>
        ) : null}
      </View>

      {formError ? (
        <View
          style={{
            backgroundColor: theme.errorLight,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: theme.error,
            padding: space.md,
          }}
        >
          <Text style={[type.bodySm, { color: theme.error }]}>{formError}</Text>
        </View>
      ) : null}

      <Field
        label="Title"
        value={title}
        onChange={setTitle}
        placeholder="e.g. Core banking upgrade"
        error={fieldErrors.title?.[0]}
      />

      {!isEdit ? (
        <SelectField
          label="Sector"
          value={sector}
          onChange={setSector}
          options={(sectors.data ?? []).map((item) => ({
            id: item.id,
            label: item.name,
            color: item.color,
          }))}
          placeholder="Choose a sector"
          searchPlaceholder="Search sectors"
          error={fieldErrors.sector_id?.[0]}
        />
      ) : (
        <SelectField
          label="Sector"
          value={sector}
          onChange={() => undefined}
          options={[]}
          // Moving sectors would move the deal to a different pipeline — that is not a
          // field edit, so it is shown for context and locked.
          disabled
          placeholder="—"
        />
      )}

      <SelectField
        label="Client"
        optional
        value={client}
        onChange={setClient}
        search={searchClients}
        placeholder="Search for a client"
        searchPlaceholder="Type a client name"
        error={fieldErrors.client_id?.[0]}
      />

      <Field
        label="Value"
        optional
        value={value}
        onChange={setValue}
        placeholder="0.00"
        keyboardType="numeric"
        error={fieldErrors.value?.[0]}
      />

      {/* Two options, so segmented rather than a select — the rule about switching to
          a searchable picker starts above four. */}
      <View style={{ gap: 6 }}>
        <Text style={[type.micro, { color: theme.textSecondary, letterSpacing: 1.1 }]}>
          CURRENCY
        </Text>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {(['USD', 'MMK'] as const).map((option) => (
            <Pressable
              key={option}
              onPress={() => setCurrency(option)}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: space.md,
                borderRadius: radius.md,
                backgroundColor: currency === option ? theme.primary : theme.surface,
                borderWidth: 1,
                borderColor: currency === option ? theme.primary : theme.border,
              }}
            >
              <Text
                style={[
                  type.body,
                  { color: currency === option ? '#fff' : theme.textSecondary, fontWeight: '700' },
                ]}
              >
                {option === 'USD' ? '$ USD' : 'K MMK'}
              </Text>
            </Pressable>
          ))}
        </View>
        {fieldErrors.currency?.[0] ? (
          <Text style={[type.micro, { color: '#DC2626' }]}>{fieldErrors.currency[0]}</Text>
        ) : null}
      </View>

      <Field
        label="Notes"
        optional
        value={notes}
        onChange={setNotes}
        placeholder="Context, next steps…"
        multiline
        error={fieldErrors.notes?.[0]}
      />

      <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.sm }}>
        <Pressable
          onPress={onCancel}
          style={({ pressed }) => [
            {
              flex: 1,
              backgroundColor: theme.surfaceOffset,
              borderRadius: radius.md,
              paddingVertical: 14,
              alignItems: 'center',
            },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={[type.heading, { color: theme.textSecondary, fontSize: 14 }]}>Cancel</Text>
        </Pressable>

        <Pressable
          onPress={save}
          disabled={!canSave}
          style={({ pressed }) => [
            {
              flex: 2,
              backgroundColor: canSave ? theme.primary : theme.surfaceOffset,
              borderRadius: radius.md,
              paddingVertical: 14,
              alignItems: 'center',
            },
            pressed && canSave && { opacity: 0.85 },
          ]}
        >
          <Text style={[type.heading, { color: canSave ? '#fff' : theme.textFaint, fontSize: 14 }]}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create lead'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
