import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTheme, fonts, radii } from '../context/ThemeContext';
import { Avatar, Badge, Card, Icon, PrimaryButton, SecondaryButton, SectionHead } from './ui';
import { getSectors, updateUser } from '../lib/cockpit';
import type { CockpitUser, MeetingGroup, UserRole } from '../types';
import { formatMeetingGroup, getMeetingGroupOptions, normalizeMeetingGroup } from '../utils/meetingGroups';

type Props = {
  user: CockpitUser;
  role: UserRole;
  onOpenAdmin: () => void;
  onOpenTeamOverview: () => void;
  onLogout: () => void;
  onSwitchRole?: (r: UserRole) => void;
  onUserUpdated?: (user: CockpitUser) => void;
};

type EditingMode = null | 'department' | 'target' | 'sectors';

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Admin',
  management: 'Management',
  sales: 'Sales',
  solution: 'Solution',
  am: 'Account Manager',
};

export default function ProfileScreen({
  user, role, onOpenAdmin, onLogout, onSwitchRole, onUserUpdated,
}: Props) {
  const { theme, isDark, setMode } = useTheme();
  const isMgmt = role === 'admin' || role === 'management';
  const groupOptions = getMeetingGroupOptions(role);
  const canEditDepartment = role !== 'am';

  const [me, setMe] = useState<CockpitUser>(user);
  const [editing, setEditing] = useState<EditingMode>(null);
  const [draftDepartment, setDraftDepartment] = useState<MeetingGroup | null>(normalizeMeetingGroup(user.meeting_group));
  const [draftTarget, setDraftTarget] = useState(user.target_usd != null ? String(user.target_usd) : '');
  const [availableSectors, setAvailableSectors] = useState<string[]>([]);
  const [draftSectors, setDraftSectors] = useState<string[]>(user.owned_sectors ?? []);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  useEffect(() => {
    setMe(user);
    setDraftDepartment(normalizeMeetingGroup(user.meeting_group));
    setDraftTarget(user.target_usd != null ? String(user.target_usd) : '');
    setDraftSectors(user.owned_sectors ?? []);
  }, [user]);

  useEffect(() => {
    void getSectors().then((sectorData) => setAvailableSectors(sectorData)).catch(() => setAvailableSectors([]));
  }, []);

  const openDepartment = () => {
    if (!canEditDepartment) return;
    setDraftDepartment(normalizeMeetingGroup(me.meeting_group));
    setSaveErr(null);
    setEditing('department');
  };

  const openTarget = () => {
    setDraftTarget(me.target_usd != null ? String(me.target_usd) : '');
    setSaveErr(null);
    setEditing('target');
  };

  const openSectors = () => {
    setDraftSectors(me.owned_sectors ?? []);
    setSaveErr(null);
    void getSectors().then((sectorData) => setAvailableSectors(sectorData)).catch(() => setAvailableSectors([]));
    setEditing('sectors');
  };

  const handleUserUpdate = (nextUser: CockpitUser) => {
    setMe(nextUser);
    onUserUpdated?.(nextUser);
    setEditing(null);
  };

  const saveDepartment = async () => {
    setSaving(true);
    setSaveErr(null);
    try {
      const updated = await updateUser(me._id, { meeting_group: draftDepartment ?? null });
      handleUserUpdate({ ...me, ...updated, meeting_group: draftDepartment ?? null });
    } catch {
      setSaveErr('Could not save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const saveTarget = async () => {
    setSaving(true);
    setSaveErr(null);
    try {
      const cleaned = draftTarget.replace(/[^\d]/g, '');
      const num = cleaned ? Number(cleaned) : null;
      const updated = await updateUser(me._id, { target_usd: num });
      handleUserUpdate({ ...me, ...updated, target_usd: num });
    } catch {
      setSaveErr('Could not save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const saveSectors = async () => {
    setSaving(true);
    setSaveErr(null);
    try {
      const ownedSectors = Array.from(new Set(draftSectors.filter(Boolean))).sort();
      const updated = await updateUser(me._id, { owned_sectors: ownedSectors });
      handleUserUpdate({ ...me, ...updated, owned_sectors: ownedSectors });
    } catch {
      setSaveErr('Could not save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const ownedSectors = me.owned_sectors?.length ? me.owned_sectors : [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ paddingBottom: 120, paddingTop: 12 }}
    >
      <View style={{ paddingHorizontal: 16 }}>
        <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
          <Avatar name={me.name} size={72} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text, marginTop: 12, fontFamily: fonts.display }}>
            {me.name}
          </Text>
          <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 2 }}>{me.email}</Text>
          <Text style={{ fontSize: 11, color: theme.textFaint, marginTop: 4 }}>{ROLE_LABEL[role]} profile</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
            <Badge tone="teal">{ROLE_LABEL[role]}</Badge>
          </View>
        </Card>
      </View>

      <SectionHead title="My Info" />
      <View style={{ paddingHorizontal: 16 }}>
        <Card padded={false}>
          <EditableRow
            label="Department"
            value={me.meeting_group ? formatMeetingGroup(me.meeting_group) : '—'}
            onPress={canEditDepartment ? openDepartment : undefined}
            theme={theme}
          />
          <Divider theme={theme} />
          <EditableRow
            label="Target (USD)"
            value={me.target_usd ? `$${me.target_usd.toLocaleString()}` : '—'}
            onPress={openTarget}
            theme={theme}
          />
        </Card>
      </View>

      <SectionHead title="Owned Sectors" />
      <View style={{ paddingHorizontal: 16 }}>
        <Card>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {ownedSectors.length > 0 ? ownedSectors.map((sector) => (
              <Badge key={sector} tone="teal">{sector}</Badge>
            )) : <Badge tone="muted">No sectors selected</Badge>}
            <Pressable onPress={openSectors} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.full, backgroundColor: theme.surfaceOffset }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textSecondary }}>+ Add</Text>
            </Pressable>
          </View>
        </Card>
      </View>

      <SectionHead title="Preview as role (dev)" />
      <View style={{ paddingHorizontal: 16 }}>
        <Card>
          <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 10 }}>
            Preview navigation and access states directly from this account.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {(['admin', 'management', 'sales', 'solution', 'am'] as UserRole[]).map((r2) => {
              const active = r2 === role;
              return (
                <Pressable
                  key={r2}
                  onPress={() => onSwitchRole?.(r2)}
                  style={({ pressed }) => [{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: radii.full,
                    backgroundColor: active ? theme.primary : theme.surfaceOffset,
                  }, pressed && { opacity: 0.85 }]}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: active ? '#fff' : theme.textSecondary }}>
                    {ROLE_LABEL[r2]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {!onSwitchRole ? <Text style={{ fontSize: 10, color: theme.textFaint, marginTop: 8 }}>Role switching not enabled in this build.</Text> : null}
        </Card>
      </View>

      {isMgmt ? (
        <>
          <SectionHead title="Tools" />
          <View style={{ paddingHorizontal: 16 }}>
            <Card padded={false} onPress={onOpenAdmin}>
              <View style={r.row}>
                <View style={[r.iconWrap, { backgroundColor: theme.primaryLight }]}>
                  <Icon.Settings size={18} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>Admin Tools</Text>
                  <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>Sectors, quarters, approvals</Text>
                </View>
                <Icon.ChevronRight size={16} color={theme.textFaint} />
              </View>
            </Card>
          </View>
        </>
      ) : null}

      <SectionHead title="Settings" />
      <View style={{ paddingHorizontal: 16 }}>
        <Card padded={false}>
          <Pressable
            onPress={() => setMode(isDark ? 'light' : 'dark')}
            style={({ pressed }) => [r.row, pressed && { backgroundColor: theme.surfaceOffset }]}
          >
            <View style={[r.iconWrap, { backgroundColor: theme.surfaceOffset }]}>
              {isDark ? <Icon.Sun size={18} color={theme.text} /> : <Icon.Moon size={18} color={theme.text} />}
            </View>
            <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: theme.text }}>Theme</Text>
            <Text style={{ fontSize: 12, color: theme.textSecondary, marginRight: 6 }}>{isDark ? 'Dark' : 'Light'}</Text>
            <Icon.ChevronRight size={16} color={theme.textFaint} />
          </Pressable>
          <Divider theme={theme} />
          <Pressable
            onPress={onLogout}
            style={({ pressed }) => [r.row, pressed && { backgroundColor: theme.surfaceOffset }]}
          >
            <View style={[r.iconWrap, { backgroundColor: theme.errorLight }]}>
              <Icon.Logout size={18} color={theme.error} />
            </View>
            <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: theme.error }}>Sign out</Text>
            <Icon.ChevronRight size={16} color={theme.error} />
          </Pressable>
        </Card>
        <Text style={{ fontSize: 11, color: theme.textFaint, textAlign: 'center', marginTop: 20 }}>VisitPlan v2.4 · BIM Group Myanmar</Text>
      </View>

      <Modal visible={editing !== null} transparent animationType="fade" onRequestClose={() => !saving && setEditing(null)}>
        <Pressable onPress={() => !saving && setEditing(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: theme.surface, borderRadius: radii.lg, padding: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text, fontFamily: fonts.display, marginBottom: 14 }}>
              {editing === 'department' ? 'Choose department' : editing === 'sectors' ? 'Choose sectors' : 'Set target (USD)'}
            </Text>

            {editing === 'department' ? (
              <View style={{ gap: 8 }}>
                {groupOptions.map((group) => {
                  const active = draftDepartment === group;
                  return (
                    <Pressable
                      key={group}
                      onPress={() => setDraftDepartment(group)}
                      style={({ pressed }) => [{
                        paddingVertical: 12,
                        paddingHorizontal: 14,
                        borderRadius: radii.md,
                        backgroundColor: active ? theme.primaryLight : theme.surfaceOffset,
                        borderWidth: 1,
                        borderColor: active ? theme.primary : 'transparent',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }, pressed && { opacity: 0.85 }]}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '600', color: active ? theme.primary : theme.text }}>{formatMeetingGroup(group)}</Text>
                      {active ? <Icon.Check size={16} color={theme.primary} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            ) : editing === 'sectors' ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {availableSectors.map((sector) => {
                  const active = draftSectors.includes(sector);
                  return (
                    <Pressable
                      key={sector}
                      onPress={() => setDraftSectors((current) => active ? current.filter((item) => item !== sector) : [...current, sector])}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: radii.full,
                        backgroundColor: active ? theme.primaryLight : theme.surfaceOffset,
                        borderWidth: 1,
                        borderColor: active ? theme.primary : 'transparent',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: active ? theme.primary : theme.textSecondary }}>{sector}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <TextInput
                value={draftTarget}
                onChangeText={(text) => setDraftTarget(text.replace(/[^\d]/g, ''))}
                placeholder="e.g. 50000"
                placeholderTextColor={theme.textFaint}
                keyboardType="numeric"
                style={{
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: radii.md,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 16,
                  color: theme.text,
                  backgroundColor: theme.surfaceOffset,
                }}
              />
            )}

            {saveErr ? <Text style={{ color: theme.error, fontSize: 12, marginTop: 10 }}>{saveErr}</Text> : null}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
              <View style={{ flex: 1 }}>
                <SecondaryButton label="Cancel" onPress={() => !saving && setEditing(null)} />
              </View>
              <View style={{ flex: 1 }}>
                {saving ? (
                  <View style={{ backgroundColor: theme.primary, borderRadius: radii.md, paddingVertical: 14, alignItems: 'center' }}>
                    <ActivityIndicator color="#fff" />
                  </View>
                ) : (
                  <PrimaryButton label="Save" onPress={editing === 'department' ? saveDepartment : editing === 'sectors' ? saveSectors : saveTarget} />
                )}
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function EditableRow({ label, value, onPress, theme }: {
  label: string;
  value: string;
  onPress?: () => void;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        opacity: onPress ? 1 : 0.72,
      }, onPress && pressed && { backgroundColor: theme.surfaceOffset }]}
    >
      <Text style={{ fontSize: 14, color: theme.text, fontWeight: '500' }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={{ fontSize: 14, color: theme.textSecondary }}>{value}</Text>
        {onPress ? <Icon.Edit size={14} color={theme.textFaint} /> : null}
      </View>
    </Pressable>
  );
}

function Divider({ theme }: { theme: ReturnType<typeof useTheme>['theme'] }) {
  return <View style={{ height: 1, backgroundColor: theme.divider, marginHorizontal: 16 }} />;
}

const r = {
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
};
