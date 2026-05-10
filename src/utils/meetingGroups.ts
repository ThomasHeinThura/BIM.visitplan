import type { MeetingGroup, UserRole } from '../types';

const GROUP_ALIAS_MAP: Record<string, MeetingGroup> = {
  infra: 'infra',
  infrastructure: 'infra',
  es: 'es',
  enterprisesolutions: 'es',
  'enterprise solutions': 'es',
  app: 'app',
  application: 'app',
  ms: 'ms',
  microsoft: 'ms',
  account: 'account',
  am: 'account',
  accountmanager: 'account',
  'account manager': 'account',
  all: 'all',
  alldepartments: 'all',
  'all departments': 'all',
};

export const MEETING_GROUP_LABELS: Record<MeetingGroup, string> = {
  infra: 'Infrastructure',
  es: 'Enterprise Solutions',
  app: 'Application',
  ms: 'Microsoft',
  account: 'Account Manager',
  all: 'All Departments',
};

const DEFAULT_VISIT_GROUP_OPTIONS: Exclude<MeetingGroup, 'all' | 'account'>[] = ['infra', 'es', 'app', 'ms'];

function normalizeGroupKey(value: string) {
  return value.trim().toLowerCase().replace(/[\-_]+/g, ' ').replace(/\s+/g, ' ');
}

export function normalizeMeetingGroup(value?: string | null): MeetingGroup | null {
  if (!value) return null;
  const normalized = normalizeGroupKey(value);
  return GROUP_ALIAS_MAP[normalized] ?? GROUP_ALIAS_MAP[normalized.replace(/\s+/g, '')] ?? null;
}

export function formatMeetingGroup(value?: string | null) {
  const normalized = normalizeMeetingGroup(value);
  return normalized ? MEETING_GROUP_LABELS[normalized] : 'Unassigned';
}

export function getMeetingGroupOptions(role: UserRole): MeetingGroup[] {
  if (role === 'am') {
    return ['account'];
  }
  if (role === 'sales' || role === 'solution') {
    return DEFAULT_VISIT_GROUP_OPTIONS;
  }
  if (role === 'admin' || role === 'management') {
    return [...DEFAULT_VISIT_GROUP_OPTIONS, 'all'];
  }
  return DEFAULT_VISIT_GROUP_OPTIONS;
}

export function getVisitMeetingGroupOptions(): Exclude<MeetingGroup, 'all' | 'account'>[] {
  return DEFAULT_VISIT_GROUP_OPTIONS;
}

export function canAccessAllGroups(role: UserRole, value?: string | null) {
  return (role === 'admin' || role === 'management') && normalizeMeetingGroup(value) === 'all';
}