/**
 * Who works this deal, and any handover in flight.
 *
 * The two halves are presented differently on purpose. Adding a colleague is one
 * control that takes effect immediately and leaves the deal where it is. Moving the
 * deal to another account manager takes the current owner's access away, so it is a
 * request with a reason that a sector head decides — shown as a standing amber panel
 * rather than a button, because it is a state the deal is in, not an action available.
 *
 * Presenting them as the same kind of thing is what leads people to reach for the
 * wrong one, and here the wrong one costs someone their pipeline entry.
 */

import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { useTheme } from '../../context/ThemeContext';
import {
  addCollaborator,
  approveTransfer,
  ELIGIBLE_ROLES,
  rejectTransfer,
  removeCollaborator,
  requestTransfer,
  searchPeople,
  withdrawTransfer,
  type CollaboratorRole,
} from '../../lib/crm/collaboration';
import { CrmApiError } from '../../lib/crm/client';
import type { Deal, DealCollaborator, DealTransferRequest } from '../../lib/crm/types';
import { SelectField, type SelectOption } from '../../ui/SelectField';
import { alpha, radius, space, type } from '../../ui/tokens';

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function formatDay(value: string | null): string {
  if (!value) return '';
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Surfaces the server's own message — it explains exactly why, and phrasing it again
 *  here would mean two wordings for one rule, one of which is not enforced. */
function reportFailure(err: unknown, fallback: string) {
  if (err instanceof CrmApiError) {
    const field = Object.values(err.fieldErrors)[0]?.[0];
    Alert.alert('Could not save', field ?? err.message);
    return;
  }
  Alert.alert('Could not save', fallback);
}

export function DealTeamPanel({
  deal,
  collaborators,
  transfers,
  onChanged,
}: {
  deal: Deal;
  collaborators: DealCollaborator[];
  transfers: DealTransferRequest[];
  onChanged: () => void;
}) {
  const { theme } = useTheme();

  const [role, setRole] = useState<CollaboratorRole>('sales');
  const [person, setPerson] = useState<SelectOption | null>(null);
  const [transferTo, setTransferTo] = useState<SelectOption | null>(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [busy, setBusy] = useState(false);

  const pending = transfers.find((transfer) => transfer.status === 'pending');
  const decided = transfers.filter((transfer) => transfer.status !== 'pending');

  const onDeal = new Set<number>([
    ...(deal.owner ? [deal.owner.id] : []),
    ...collaborators.map((collaborator) => collaborator.user.id),
  ]);

  async function run(action: () => Promise<unknown>, fallback: string) {
    setBusy(true);
    try {
      await action();
      onChanged();
    } catch (err) {
      reportFailure(err, fallback);
    } finally {
      setBusy(false);
    }
  }

  const searchFor = (roles: string[], excludeOnDeal: boolean) =>
    async (query: string, signal: AbortSignal): Promise<SelectOption[]> => {
      const page = await searchPeople({ search: query, role: roles, per_page: 25 }, signal);

      return page.data
        // Filtering client-side because "already on this deal" is a fact about this
        // screen, not about the directory — the endpoint has no reason to know it.
        .filter((entry) => !excludeOnDeal || !onDeal.has(entry.id))
        .map((entry) => ({
          id: entry.id,
          label: entry.name,
          hint: entry.sector?.name ?? entry.email,
          color: entry.sector?.color ?? null,
        }));
    };

  return (
    <View style={{ gap: space.xl }}>
      {/* ── Owner ─────────────────────────────────────────────────────────── */}
      <View style={{ gap: space.sm }}>
        <Text style={[type.micro, { color: theme.textSecondary, letterSpacing: 1.2 }]}>
          OWNER
        </Text>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.md,
            backgroundColor: theme.surface,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: theme.border,
            padding: space.md,
          }}
        >
          <Avatar name={deal.owner?.name ?? '?'} tint={theme.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[type.body, { color: theme.text, fontWeight: '700' }]}>
              {deal.owner?.name ?? 'Unassigned'}
            </Text>
            <Text style={[type.micro, { color: theme.textSecondary }]}>
              Account manager · accountable for this deal
            </Text>
          </View>
        </View>
      </View>

      {/* ── Collaborators ─────────────────────────────────────────────────── */}
      <View style={{ gap: space.sm }}>
        <Text style={[type.micro, { color: theme.textSecondary, letterSpacing: 1.2 }]}>
          WORKING ON IT
        </Text>

        {collaborators.length === 0 ? (
          <View
            style={{
              borderRadius: radius.md,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: theme.border,
              padding: space.lg,
            }}
          >
            <Text style={[type.body, { color: theme.textSecondary }]}>
              No one else has access. Add the sales exec or consultant staffed on this
              so they can see it here instead of keeping their own copy.
            </Text>
          </View>
        ) : (
          collaborators.map((collaborator) => (
            <View
              key={collaborator.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.md,
                backgroundColor: theme.surface,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: theme.border,
                padding: space.md,
              }}
            >
              <Avatar name={collaborator.user.name} tint={theme.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={[type.body, { color: theme.text, fontWeight: '600' }]}>
                  {collaborator.user.name}
                </Text>
                <Text style={[type.micro, { color: theme.textSecondary }]}>
                  {collaborator.role_label}
                  {collaborator.added_by ? ` · added by ${collaborator.added_by.name}` : ''}
                </Text>
              </View>

              {deal.can.add_collaborator ? (
                <Pressable
                  disabled={busy}
                  hitSlop={8}
                  onPress={() =>
                    Alert.alert(
                      'Remove from deal?',
                      `${collaborator.user.name} will lose access to this deal.`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Remove',
                          style: 'destructive',
                          onPress: () =>
                            void run(
                              () => removeCollaborator(deal.id, collaborator.user.id),
                              'Could not remove them from the deal.',
                            ),
                        },
                      ],
                    )
                  }
                >
                  <Text style={[type.micro, { color: theme.textSecondary }]}>Remove</Text>
                </Pressable>
              ) : null}
            </View>
          ))
        )}

        {deal.can.add_collaborator ? (
          <View
            style={{
              gap: space.sm,
              backgroundColor: alpha(theme.border, 0.25),
              borderRadius: radius.md,
              padding: space.md,
            }}
          >
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              {(['sales', 'consultant'] as CollaboratorRole[]).map((option) => (
                <Pressable
                  key={option}
                  onPress={() => {
                    setRole(option);
                    // The eligible people change with the role, so a selection made
                    // under the old filter may no longer be valid. Clearing it beats a
                    // 422 explaining that on submit.
                    setPerson(null);
                  }}
                  style={{
                    paddingHorizontal: space.md,
                    paddingVertical: space.xs + 2,
                    borderRadius: radius.pill,
                    backgroundColor: role === option ? theme.primary : theme.surface,
                    borderWidth: 1,
                    borderColor: role === option ? theme.primary : theme.border,
                  }}
                >
                  <Text
                    style={[
                      type.micro,
                      {
                        color: role === option ? '#fff' : theme.textSecondary,
                        fontWeight: '700',
                      },
                    ]}
                  >
                    {option === 'sales' ? 'Sales' : 'Consultant'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <SelectField
              label="Add a colleague"
              optional
              placeholder="Search by name or email"
              search={searchFor(ELIGIBLE_ROLES[role], true)}
              value={person}
              onChange={setPerson}
            />

            <Pressable
              disabled={!person || busy}
              onPress={() =>
                void run(async () => {
                  await addCollaborator(deal.id, person!.id, role);
                  setPerson(null);
                }, 'Could not add them to the deal.')
              }
              style={{
                alignItems: 'center',
                backgroundColor: person && !busy ? theme.primary : theme.border,
                borderRadius: radius.md,
                paddingVertical: space.md,
              }}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[type.body, { color: '#fff', fontWeight: '700' }]}>
                  Add to deal
                </Text>
              )}
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* ── Ownership ─────────────────────────────────────────────────────── */}
      <View style={{ gap: space.sm }}>
        <Text style={[type.micro, { color: theme.textSecondary, letterSpacing: 1.2 }]}>
          OWNERSHIP
        </Text>

        {pending ? (
          <View
            style={{
              backgroundColor: alpha('#F59E0B', 0.12),
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: alpha('#F59E0B', 0.4),
              padding: space.md,
              gap: space.sm,
            }}
          >
            <Text style={[type.body, { color: theme.text, fontWeight: '700' }]}>
              {pending.requested_by?.name} asked to move this deal from{' '}
              {pending.from_user?.name} to {pending.to_user?.name}.
            </Text>

            {pending.reason ? (
              <Text style={[type.body, { color: theme.textSecondary }]}>
                “{pending.reason}”
              </Text>
            ) : null}

            <Text style={[type.micro, { color: theme.textSecondary }]}>
              Requested {formatDay(pending.created_at)} · waiting on sector head approval
            </Text>

            <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
              {deal.can.approve_transfer ? (
                <>
                  <ActionButton
                    disabled={busy}
                    label="Approve"
                    tint={theme.primary}
                    onPress={() =>
                      Alert.alert(
                        'Approve transfer?',
                        `${pending.to_user?.name} takes over the deal. ${pending.from_user?.name} loses access to it.`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Approve',
                            onPress: () =>
                              void run(
                                () => approveTransfer(pending.id),
                                'Could not approve the transfer.',
                              ),
                          },
                        ],
                      )
                    }
                  />
                  <ActionButton
                    disabled={busy}
                    label="Reject"
                    outline
                    tint={theme.textSecondary}
                    onPress={() =>
                      void run(() => rejectTransfer(pending.id), 'Could not reject the transfer.')
                    }
                  />
                </>
              ) : null}

              {deal.can.request_transfer ? (
                <ActionButton
                  disabled={busy}
                  label="Withdraw"
                  outline
                  tint={theme.textSecondary}
                  onPress={() =>
                    void run(() => withdrawTransfer(pending.id), 'Could not withdraw the request.')
                  }
                />
              ) : null}
            </View>
          </View>
        ) : deal.can.request_transfer ? (
          showTransfer ? (
            <View
              style={{
                gap: space.sm,
                backgroundColor: alpha(theme.border, 0.25),
                borderRadius: radius.md,
                padding: space.md,
              }}
            >
              <Text style={[type.micro, { color: theme.textSecondary }]}>
                Transferring hands the deal to another account manager.{' '}
                {deal.owner?.name} loses access to it, so a sector head has to approve.
              </Text>

              <SelectField
                label="Transfer to"
                placeholder="Which account manager?"
                search={searchFor(['account_manager', 'sector_head'], false)}
                value={transferTo}
                onChange={setTransferTo}
              />

              <View style={{ flexDirection: 'row', gap: space.sm }}>
                <ActionButton
                  disabled={!transferTo || busy}
                  label="Request transfer"
                  tint={theme.primary}
                  onPress={() =>
                    void run(async () => {
                      await requestTransfer(deal.id, transferTo!.id);
                      setTransferTo(null);
                      setShowTransfer(false);
                    }, 'Could not request the transfer.')
                  }
                />
                <ActionButton
                  label="Cancel"
                  outline
                  tint={theme.textSecondary}
                  onPress={() => setShowTransfer(false)}
                />
              </View>
            </View>
          ) : (
            <ActionButton
              label="Transfer to another account manager"
              outline
              tint={theme.textSecondary}
              onPress={() => setShowTransfer(true)}
            />
          )
        ) : null}

        {decided.map((transfer) => (
          <View
            key={transfer.id}
            style={{
              backgroundColor: theme.surface,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: theme.border,
              padding: space.md,
            }}
          >
            <Text style={[type.body, { color: theme.text }]}>
              {transfer.from_user?.name} → {transfer.to_user?.name} ·{' '}
              {transfer.status_label}
            </Text>
            <Text style={[type.micro, { color: theme.textSecondary }]}>
              {transfer.decided_by?.name ?? ''} {formatDay(transfer.decided_at)}
              {transfer.decision_note ? ` · ${transfer.decision_note}` : ''}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Avatar({ name, tint }: { name: string; tint: string }) {
  return (
    <View
      style={{
        width: 38,
        height: 38,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: alpha(tint, 0.15),
      }}
    >
      <Text style={[type.micro, { color: tint, fontWeight: '800' }]}>{initials(name)}</Text>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  tint,
  outline = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  tint: string;
  outline?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        flexGrow: 1,
        alignItems: 'center',
        borderRadius: radius.md,
        paddingVertical: space.md,
        paddingHorizontal: space.lg,
        opacity: disabled ? 0.5 : 1,
        backgroundColor: outline ? 'transparent' : tint,
        borderWidth: 1,
        borderColor: tint,
      }}
    >
      <Text
        style={[type.body, { color: outline ? tint : '#fff', fontWeight: '700' }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
